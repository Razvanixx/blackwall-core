import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlackwallApplication } from '../../src/app/application.mjs';

const now = Date.parse('2026-01-01T00:00:00.000Z');

function policy() {
  return {
    version: 1,
    policyId: 'app-policy',
    grants: [{
      id: 'read-input',
      principal: 'test-agent',
      session: 'test-session',
      action: 'file.read',
      resource: { path: 'C:\\AgentWork\\input.txt' },
      expiresAt: '2026-01-01T01:00:00.000Z',
    }],
  };
}

test('coordinates sessions, decisions, revocation, and content-free audit', () => {
  const app = createBlackwallApplication({ clock: () => now });
  const created = app.createSession({
    principal: 'test-agent',
    session: 'test-session',
    policy: policy(),
    ttlMs: 60_000,
  });
  const result = app.submit(created.token, JSON.stringify({
    version: 1,
    sequence: 1,
    request: { action: 'file.read', resource: { path: 'C:\\AgentWork\\input.txt' } },
  }));

  assert.equal(result.decision, 'allow');
  assert.equal(app.status().activeSessions, 1);
  assert.equal(app.revokeSession('test-session'), true);
  assert.equal(app.status().activeSessions, 0);

  const serialized = JSON.stringify(app.auditSnapshot());
  assert.match(serialized, /session\.created/);
  assert.match(serialized, /request\.allowed/);
  assert.match(serialized, /session\.revoked/);
  assert.doesNotMatch(serialized, /AgentWork|input\.txt|[a-f0-9]{64}/);
});

test('records unauthenticated denials without inventing a trusted identity', () => {
  const app = createBlackwallApplication({ clock: () => now });
  const result = app.submit('invalid', '{');
  assert.equal(result.decision, 'deny');
  assert.deepEqual(app.auditSnapshot()[0], {
    sequence: 1,
    timestamp: now,
    type: 'request.denied',
    principal: 'unknown-principal',
    session: 'unknown-session',
    decisionCode: 'BW_SESSION_INVALID',
  });
});
