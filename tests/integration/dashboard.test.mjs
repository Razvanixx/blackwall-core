import test from 'node:test';
import assert from 'node:assert/strict';
import { createDashboardServer } from '../../src/app/server.mjs';

const ownerToken = 'owner-token-with-at-least-thirty-two-characters';

function authorized(options = {}) {
  return {
    ...options,
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  };
}

test('serves the dashboard locally and protects owner APIs', async (context) => {
  const dashboard = createDashboardServer({ ownerToken });
  const { origin, dashboardUrl } = await dashboard.start();
  context.after(() => dashboard.stop());

  assert.match(dashboardUrl, /^http:\/\/127\.0\.0\.1:\d+\/#token=/);

  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(await page.text(), /Blackwall Core/);

  const anonymous = await fetch(`${origin}/api/status`);
  assert.equal(anonymous.status, 401);

  const crossOrigin = await fetch(`${origin}/api/status`, authorized({
    headers: { Origin: 'https://attacker.invalid' },
  }));
  assert.equal(crossOrigin.status, 403);

  const status = await fetch(`${origin}/api/status`, authorized());
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), {
    name: 'Blackwall Core',
    version: 1,
    maturity: 'experimental',
    enforcementLevel: 'L0',
    activeSessions: 0,
    auditEvents: 0,
  });
});

test('evaluates a policy through the authenticated local API', async (context) => {
  const dashboard = createDashboardServer({ ownerToken });
  const { origin } = await dashboard.start();
  context.after(() => dashboard.stop());
  const expiresAt = new Date(Date.now() + 60_000).toISOString();

  const sessionResponse = await fetch(`${origin}/api/sessions`, authorized({
    method: 'POST',
    body: JSON.stringify({
      principal: 'desktop-agent',
      session: 'dashboard-test',
      ttlMs: 30_000,
      policy: {
        version: 1,
        policyId: 'dashboard-policy',
        grants: [{
          id: 'read-input',
          principal: 'desktop-agent',
          session: 'dashboard-test',
          action: 'file.read',
          resource: { path: 'C:\\AgentWork\\input.txt' },
          expiresAt,
        }],
      },
    }),
  }));
  assert.equal(sessionResponse.status, 201);
  const session = await sessionResponse.json();

  const decisionResponse = await fetch(`${origin}/api/decisions`, authorized({
    method: 'POST',
    body: JSON.stringify({
      capability: session.token,
      frame: JSON.stringify({
        version: 1,
        sequence: 1,
        request: { action: 'file.read', resource: { path: 'C:\\AgentWork\\input.txt' } },
      }),
    }),
  }));
  assert.equal(decisionResponse.status, 200);
  assert.equal((await decisionResponse.json()).decision, 'allow');

  const auditResponse = await fetch(`${origin}/api/audit`, authorized());
  const { events } = await auditResponse.json();
  assert.equal(events.length, 2);
  assert.equal(events[1].type, 'request.allowed');
});
