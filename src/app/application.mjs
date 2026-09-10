import { createHash } from 'node:crypto';
import { createAuditJournal } from '../audit/journal.mjs';
import { createDecisionBroker } from '../protocol/broker.mjs';

const capabilityKey = (capability) => createHash('sha256').update(capability).digest('hex');

export function createBlackwallApplication({
  clock = Date.now,
  maxSessions = 32,
  maxRequestsPerSession = 1_000,
  auditCapacity = 512,
} = {}) {
  const broker = createDecisionBroker({ clock, maxSessions, maxRequestsPerSession });
  const audit = createAuditJournal({ clock, capacity: auditCapacity });
  const sessions = new Map();

  function createSession(input) {
    const created = broker.createSession(input);
    sessions.set(capabilityKey(created.token), Object.freeze({
      principal: input.principal,
      session: input.session,
      expiresAt: created.expiresAt,
    }));
    audit.append({
      type: 'session.created',
      principal: input.principal,
      session: input.session,
    });
    return created;
  }

  function submit(capability, frame) {
    const identity = typeof capability === 'string'
      ? sessions.get(capabilityKey(capability))
      : undefined;
    const result = broker.submit(capability, frame);

    let action;
    try {
      const value = JSON.parse(frame);
      if (typeof value?.request?.action === 'string') action = value.request.action;
    } catch {
      // The broker returns a stable protocol denial for malformed frames.
    }

    audit.append({
      type: result.decision === 'allow' ? 'request.allowed' : 'request.denied',
      principal: identity?.principal ?? 'unknown-principal',
      session: identity?.session ?? 'unknown-session',
      decisionCode: result.code,
      ...(action === undefined ? {} : { action }),
    });
    return result;
  }

  function revokeSession(session) {
    const revoked = broker.revokeSession(session);
    if (!revoked) return false;
    for (const [key, identity] of sessions) {
      if (identity.session !== session) continue;
      sessions.delete(key);
      audit.append({
        type: 'session.revoked',
        principal: identity.principal,
        session: identity.session,
      });
    }
    return true;
  }

  function status() {
    const now = clock();
    let activeSessions = 0;
    for (const identity of sessions.values()) {
      if (identity.expiresAt > now) activeSessions += 1;
    }
    return Object.freeze({
      name: 'Blackwall Core',
      version: 1,
      maturity: 'experimental',
      enforcementLevel: 'L0',
      activeSessions,
      auditEvents: audit.snapshot().length,
    });
  }

  return Object.freeze({
    createSession,
    submit,
    revokeSession,
    status,
    auditSnapshot: audit.snapshot,
  });
}
