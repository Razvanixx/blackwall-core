import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Readable, Writable } from 'node:stream';
import { serveLineChannel } from '../../src/protocol/channel.mjs';

function sink() {
  let value = '';
  return {
    stream: new Writable({ write(chunk, encoding, done) { value += chunk.toString(); done(); } }),
    value: () => value,
  };
}

test('handles fragmented UTF-8 frames and ordered replies', async () => {
  const bytes = Buffer.from('{"name":"ș"}\n{}\n');
  const output = sink();
  let order = 0;
  const result = await serveLineChannel({
    readable: Readable.from([bytes.subarray(0, 10), bytes.subarray(10, 12), bytes.subarray(12)]),
    writable: output.stream,
    submit: async (line) => ({ order: ++order, value: JSON.parse(line) }),
  });
  assert.equal(result.frames, 2);
  assert.equal(JSON.parse(output.value().split('\n')[0]).value.name, 'ș');
});

test('rejects invalid UTF-8, oversized, and truncated frames', async () => {
  for (const input of [Buffer.from([0xff, 10]), Buffer.alloc(16_385, 65), Buffer.from('{}')]) {
    let called = false;
    await assert.rejects(() => serveLineChannel({
      readable: Readable.from([input]),
      writable: sink().stream,
      submit: async () => { called = true; return {}; },
    }));
    assert.equal(called, false);
  }
});

test('cancels an idle channel', async () => {
  const controller = new AbortController();
  const readable = new PassThrough();
  const pending = serveLineChannel({ readable, writable: sink().stream, submit: async () => ({}), signal: controller.signal });
  controller.abort();
  await assert.rejects(() => pending, /cancelled|aborted/i);
});
