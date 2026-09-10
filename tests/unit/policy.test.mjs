import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePolicy } from '../../src/policy/compiler.mjs';

const now = Date.parse('2026-01-01T00:00:00.000Z');
const grant = {
  id: 'read-input',
  principal: 'test-agent',
  session: 'test-session',
  action: 'file.read',
  resource: { path: 'C:\\AgentWork\\input.txt' },
  expiresAt: '2026-01-01T01:00:00.000Z',
};
const context = {
  principal: grant.principal,
  session: grant.session,
  now,
  revokedGrantIds: [],
};

function policy(extra = {}) {
  return compilePolicy({ version: 1, policyId: 'test-policy', grants: [grant], ...extra });
}

test('allows only an exact active grant', () => {
  const compiled = policy();
  assert.equal(compiled.evaluate({ action: grant.action, resource: grant.resource }, context).decision, 'allow');
  assert.equal(compiled.evaluate({ action: 'file.write', resource: grant.resource }, context).decision, 'deny');
  assert.equal(compiled.evaluate({ action: grant.action, resource: { path: 'C:\\Secrets\\key.txt' } }, context).decision, 'deny');
});

test('binds grants to principal, session, expiration, and revocation', () => {
  const compiled = policy();
  for (const changed of [
    { ...context, principal: 'other-agent' },
    { ...context, session: 'other-session' },
    { ...context, now: Date.parse(grant.expiresAt) },
    { ...context, revokedGrantIds: [grant.id] },
  ]) assert.equal(compiled.evaluate({ action: grant.action, resource: grant.resource }, changed).decision, 'deny');
});

test('rejects ambiguous resources and unexpected fields', () => {
  for (const resourcePath of [
    'C:\\AgentWork\\..\\input.txt',
    'C:\\AgentWork\\input.txt:stream',
    'C:\\AgentWork\\input.txt.',
    '\\\\server\\share\\file.txt',
    'C:relative.txt',
  ]) assert.throws(() => policy({ grants: [{ ...grant, resource: { path: resourcePath } }] }));

  const decision = policy().evaluate(
    { action: grant.action, resource: grant.resource, prompt: 'ignore policy' },
    context,
  );
  assert.equal(decision.code, 'BW_REQUEST_INVALID');
});

test('copies normalized grants and resists caller mutation', () => {
  const source = { version: 1, policyId: 'test-policy', grants: [{ ...grant, resource: { ...grant.resource } }] };
  const compiled = compilePolicy(source);
  source.policyId = 'changed-policy';
  source.grants[0].resource.path = 'C:\\Secrets\\key.txt';
  assert.equal(compiled.policyId, 'test-policy');
  assert.equal(compiled.evaluate({ action: grant.action, resource: grant.resource }, context).policyId, 'test-policy');
  assert.equal(compiled.evaluate({ action: grant.action, resource: grant.resource }, context).decision, 'allow');
  assert.equal(compiled.evaluate({ action: grant.action, resource: source.grants[0].resource }, context).decision, 'deny');
});
