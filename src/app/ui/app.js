const token = new URLSearchParams(location.hash.slice(1)).get('token');
if (token) history.replaceState(null, '', `${location.pathname}${location.search}`);

const headers = Object.freeze({ Authorization: `Bearer ${token ?? ''}` });
const policyInput = document.querySelector('#policy-input');
const requestInput = document.querySelector('#request-input');
const decision = document.querySelector('#decision');
const runState = document.querySelector('#run-state');

function example() {
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  policyInput.value = JSON.stringify({
    version: 1,
    policyId: 'desktop-policy',
    grants: [{
      id: 'read-workspace',
      principal: 'desktop-agent',
      session: 'policy-lab',
      action: 'file.read',
      resource: { path: 'C:\\AgentWork\\input.txt' },
      expiresAt,
    }],
  }, null, 2);
  requestInput.value = JSON.stringify({
    action: 'file.read',
    resource: { path: 'C:\\AgentWork\\input.txt' },
  }, null, 2);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...headers, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status}).`);
  return body;
}

async function refreshStatus() {
  const status = await api('/api/status');
  document.querySelector('#level').textContent = status.enforcementLevel;
  document.querySelector('#session-count').textContent = status.activeSessions;
  document.querySelector('#event-count').textContent = status.auditEvents;
}

async function refreshAudit() {
  const { events } = await api('/api/audit');
  const rows = document.querySelector('#audit-rows');
  rows.replaceChildren();
  if (events.length === 0) {
    const row = rows.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = 'No events recorded.';
    return;
  }
  for (const event of [...events].reverse()) {
    const row = rows.insertRow();
    for (const value of [event.sequence, event.type, event.principal, event.session, event.decisionCode ?? '—']) {
      row.insertCell().textContent = value;
    }
  }
}

async function evaluate() {
  runState.textContent = 'Evaluating…';
  try {
    const policy = JSON.parse(policyInput.value);
    const request = JSON.parse(requestInput.value);
    const session = await api('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ principal: 'desktop-agent', session: 'policy-lab', policy, ttlMs: 60_000 }),
    });
    const result = await api('/api/decisions', {
      method: 'POST',
      body: JSON.stringify({
        capability: session.token,
        frame: JSON.stringify({ version: 1, sequence: 1, request }),
      }),
    });
    await api('/api/sessions/policy-lab', { method: 'DELETE' });
    decision.className = `decision ${result.decision}`;
    decision.replaceChildren();
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = `DECISION · ${result.code}`;
    const heading = document.createElement('h3');
    heading.textContent = `${result.decision} / ${result.enforcementLevel}`;
    const reason = document.createElement('p');
    reason.textContent = result.reason;
    decision.append(eyebrow, heading, reason);
    runState.textContent = 'Completed locally.';
    await refreshStatus();
  } catch (error) {
    decision.className = 'decision deny';
    decision.innerHTML = '<p class="eyebrow">ERROR</p><h3>Request rejected</h3>';
    const message = document.createElement('p');
    message.textContent = error.message;
    decision.append(message);
    runState.textContent = 'Check the policy and request.';
  }
}

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item, .view').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    document.querySelector(`#${button.dataset.view}`).classList.add('active');
    if (button.dataset.view === 'audit') refreshAudit().catch(showConnectionError);
  });
});

function showConnectionError(error) {
  runState.textContent = error.message;
  document.querySelector('.rail-status').textContent = 'Local node unavailable';
}

document.querySelector('#load-example').addEventListener('click', example);
document.querySelector('#evaluate').addEventListener('click', evaluate);
document.querySelector('#refresh-audit').addEventListener('click', () => refreshAudit().catch(showConnectionError));

example();
refreshStatus().catch(showConnectionError);
