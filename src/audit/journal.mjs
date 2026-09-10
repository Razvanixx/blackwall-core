import { BlackwallError, ErrorCode } from '../errors.mjs';
import { isIdentifier } from '../policy/resources.mjs';

const allowedTypes = new Set([
  'session.created',
  'session.revoked',
  'request.allowed',
  'request.denied',
  'request.failed',
]);

export function createAuditJournal({ capacity = 256, clock = Date.now } = {}) {
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 10_000) {
    throw new BlackwallError(ErrorCode.CHANNEL_LIMIT, 'Invalid journal capacity.');
  }
  const events = [];
  let sequence = 0;

  function append({ type, principal, session, decisionCode, action }) {
    if (
      !allowedTypes.has(type) ||
      !isIdentifier(principal) ||
      !isIdentifier(session) ||
      (decisionCode !== undefined &&
        (typeof decisionCode !== 'string' || !/^BW_[A-Z0-9_]{1,76}$/.test(decisionCode))) ||
      (action !== undefined &&
        (typeof action !== 'string' || action.length < 1 || action.length > 80))
    ) throw new BlackwallError(ErrorCode.INVALID_REQUEST, 'Invalid audit event.');

    const timestamp = clock();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw new BlackwallError(ErrorCode.CLOCK_INVALID, 'Audit clock is invalid.');
    }
    const event = Object.freeze({
      sequence: ++sequence,
      timestamp,
      type,
      principal,
      session,
      ...(decisionCode === undefined ? {} : { decisionCode }),
      ...(action === undefined ? {} : { action }),
    });
    events.push(event);
    if (events.length > capacity) events.shift();
    return event;
  }

  function snapshot() {
    return events.map((event) => Object.freeze({ ...event }));
  }

  return Object.freeze({ append, snapshot });
}
