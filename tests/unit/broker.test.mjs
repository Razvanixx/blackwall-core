import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecisionBroker } from '../../src/protocol/broker.mjs';

const start = Date.parse('2026-01-01T00:00:00.000Z');
const request = { action: 'file.read', resource: { path: 'C:\\AgentWork\\input.txt' } };
const frame = (sequence, value = request) => JSON.stringify({ version: 1, sequence, request: value });

function setup(options = {}) {
  let time = start;
  const broker = createDecisionBroker({ clock: () => time, ...options });
  const session = broker.createSession({
    principal: 'test-agent',
    session: 'test-session',
    ttlMs: 1_000,
    policy: {
      version: 1,
      policyId: 'test-policy',
      grants: [{
        id: 'read-input',
        principal: 'test-agent',
        session: 'test-session',
        ...request,
        expiresAt: '2026-01-01T01:00:00.000Z',
      }],
    },
  });
  return { broker, ...session, setTime: (value) => { time = value; } };
}

test('authenticates sessions without accepting caller identity', () => {
  const { broker, token } = setup();
  assert.equal(broker.submit('a'.repeat(64), frame(1)).decision, 'deny');
  assert.equal(broker.submit(token, JSON.stringify({ version: 1, sequence: 1, request, principal: 'admin' })).decision, 'deny');
  assert.equal(broker.submit(token, frame(1)).decision, 'allow');
});

test('rejects replay and out-of-order frames', () => {
  const { broker, token } = setup();
  assert.equal(broker.submit(token, frame(2)).code, 'BW_PROTOCOL_REPLAY');
  assert.equal(broker.submit(token, frame(1)).decision, 'allow');
  assert.equal(broker.submit(token, frame(1)).code, 'BW_PROTOCOL_REPLAY');
});

test('fails closed after revocation, expiration, and clock rollback', () => {
  const revoked = setup();
  revoked.broker.revokeSession('test-session');
  assert.equal(revoked.broker.submit(revoked.token, frame(1)).decision, 'deny');

  const expired = setup();
  expired.setTime(expired.expiresAt);
  assert.equal(expired.broker.submit(expired.token, frame(1)).code, 'BW_SESSION_EXPIRED');

  const rollback = setup();
  rollback.setTime(start - 1);
  assert.equal(rollback.broker.submit(rollback.token, frame(1)).code, 'BW_CLOCK_INVALID');
  rollback.setTime(start + 1);
  assert.equal(rollback.broker.submit(rollback.token, frame(1)).code, 'BW_CLOCK_INVALID');
});

test('bounds active sessions and requests', () => {
  const { broker, token } = setup({ maxSessions: 1, maxRequestsPerSession: 1 });
  assert.equal(broker.submit(token, '{').code, 'BW_PROTOCOL_INVALID');
  assert.equal(broker.submit(token, frame(1)).code, 'BW_REQUEST_BUDGET');
  assert.throws(() => broker.createSession({ principal: 'x', session: 'x', policy: { version: 1, policyId: 'x', grants: [] } }));
});
