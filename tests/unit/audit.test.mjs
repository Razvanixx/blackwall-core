import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuditJournal } from '../../src/audit/journal.mjs';

test('keeps a bounded content-free audit snapshot', () => {
  const journal = createAuditJournal({ capacity: 2, clock: () => 100 });
  journal.append({ type: 'session.created', principal: 'agent', session: 'session' });
  journal.append({ type: 'request.denied', principal: 'agent', session: 'session', decisionCode: 'BW_GRANT_NOT_FOUND', action: 'file.read' });
  journal.append({ type: 'session.revoked', principal: 'agent', session: 'session' });
  const events = journal.snapshot();
  assert.equal(events.length, 2);
  assert.equal(events[0].sequence, 2);
  assert.equal(JSON.stringify(events).includes('token'), false);
  assert.equal(JSON.stringify(events).includes('content'), false);
  assert.throws(() => { events[0].type = 'changed'; }, TypeError);
  assert.equal(journal.snapshot()[0].type, 'request.denied');
});
