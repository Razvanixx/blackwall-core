import { createHash, randomBytes } from 'node:crypto';
import { BlackwallError, ErrorCode, deny } from '../errors.mjs';
import { compilePolicy } from '../policy/compiler.mjs';
import { isIdentifier } from '../policy/resources.mjs';

const tokenPattern = /^[a-f0-9]{64}$/;
const tokenKey = (token) => createHash('sha256').update(token).digest('hex');

export function createDecisionBroker({
  clock = Date.now,
  maxSessions = 32,
  maxRequestsPerSession = 1_000,
} = {}) {
  if (
    typeof clock !== 'function' ||
    !Number.isSafeInteger(maxSessions) ||
    maxSessions < 1 ||
    maxSessions > 256 ||
    !Number.isSafeInteger(maxRequestsPerSession) ||
    maxRequestsPerSession < 1 ||
    maxRequestsPerSession > 100_000
  ) throw new BlackwallError(ErrorCode.SESSION_INVALID, 'Invalid broker configuration.');

  const sessions = new Map();
  let lastWallTime = -1;
  let clockFailed = false;

  function trustedNow() {
    const value = clock();
    if (clockFailed || !Number.isSafeInteger(value) || value < 0 || value < lastWallTime) {
      clockFailed = true;
      throw new BlackwallError(
        ErrorCode.CLOCK_INVALID,
        'Trusted clock is unavailable or moved backwards; recreate the broker.',
      );
    }
    lastWallTime = value;
    return value;
  }

  function sweep(now) {
    for (const [key, session] of sessions) {
      if (session.expiresAt <= now) sessions.delete(key);
    }
  }

  function createSession({ principal, session, policy, ttlMs = 300_000 }) {
    const now = trustedNow();
    sweep(now);
    if (
      !isIdentifier(principal) ||
      !isIdentifier(session) ||
      !Number.isSafeInteger(ttlMs) ||
      ttlMs < 1 ||
      ttlMs > 3_600_000
    ) throw new BlackwallError(ErrorCode.SESSION_INVALID, 'Invalid session request.');
    if (sessions.size >= maxSessions) {
      throw new BlackwallError(ErrorCode.SESSION_CAPACITY, 'Active session capacity reached.');
    }
    if ([...sessions.values()].some((entry) => entry.session === session)) {
      throw new BlackwallError(ErrorCode.SESSION_INVALID, 'Session identifier is already active.');
    }

    const compiled = compilePolicy(policy);
    if (
      compiled.grants.some(
        (grant) => grant.principal !== principal || grant.session !== session,
      )
    ) throw new BlackwallError(ErrorCode.SESSION_INVALID, 'Policy belongs to another identity.');

    const token = randomBytes(32).toString('hex');
    sessions.set(tokenKey(token), {
      principal,
      session,
      policy: compiled,
      expiresAt: now + ttlMs,
      nextSequence: 1,
      requestCount: 0,
      revokedGrantIds: new Set(),
    });
    return Object.freeze({ token, expiresAt: now + ttlMs, nextSequence: 1 });
  }

  function revokeSession(session) {
    if (!isIdentifier(session)) return false;
    let removed = false;
    for (const [key, entry] of sessions) {
      if (entry.session === session) {
        sessions.delete(key);
        removed = true;
      }
    }
    return removed;
  }

  function revokeGrant(session, grantId) {
    if (!isIdentifier(session) || !isIdentifier(grantId)) return false;
    let changed = false;
    for (const entry of sessions.values()) {
      if (entry.session === session) {
        if (entry.revokedGrantIds.size >= 256 && !entry.revokedGrantIds.has(grantId)) {
          throw new BlackwallError(ErrorCode.SESSION_CAPACITY, 'Revocation capacity reached.');
        }
        entry.revokedGrantIds.add(grantId);
        changed = true;
      }
    }
    return changed;
  }

  function submit(token, frame) {
    let now;
    try {
      now = trustedNow();
      sweep(now);
    } catch (error) {
      return deny(error.code ?? ErrorCode.CLOCK_INVALID, error.message);
    }

    if (typeof token !== 'string' || !tokenPattern.test(token)) {
      return deny(ErrorCode.SESSION_INVALID, 'Session is unauthenticated.');
    }
    const entry = sessions.get(tokenKey(token));
    if (!entry) return deny(ErrorCode.SESSION_EXPIRED, 'Session is unknown, revoked, or expired.');
    if (entry.requestCount >= maxRequestsPerSession) {
      return deny(ErrorCode.REQUEST_BUDGET, 'Session request budget is exhausted.');
    }
    entry.requestCount += 1;

    if (typeof frame !== 'string' || Buffer.byteLength(frame, 'utf8') > 16_384) {
      return deny(ErrorCode.PROTOCOL_INVALID, 'Protocol frame is invalid or oversized.');
    }

    let message;
    try {
      message = JSON.parse(frame);
    } catch {
      return deny(ErrorCode.PROTOCOL_INVALID, 'Protocol frame is not valid JSON.');
    }

    if (
      !message ||
      typeof message !== 'object' ||
      Array.isArray(message) ||
      Object.keys(message).length !== 3 ||
      !Object.keys(message).every((key) => ['version', 'sequence', 'request'].includes(key)) ||
      message.version !== 1 ||
      !Number.isSafeInteger(message.sequence)
    ) return deny(ErrorCode.PROTOCOL_INVALID, 'Protocol envelope is invalid.');

    if (message.sequence !== entry.nextSequence) {
      return deny(ErrorCode.REPLAY, 'Request is replayed or out of order.', {
        expectedSequence: entry.nextSequence,
      });
    }

    entry.nextSequence += 1;
    const result = entry.policy.evaluate(message.request, {
      principal: entry.principal,
      session: entry.session,
      now,
      revokedGrantIds: [...entry.revokedGrantIds],
    });
    return Object.freeze({
      ...result,
      sequence: message.sequence,
      nextSequence: entry.nextSequence,
    });
  }

  return Object.freeze({ createSession, revokeSession, revokeGrant, submit });
}
