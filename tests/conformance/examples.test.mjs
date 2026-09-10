import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { compilePolicy } from '../../src/policy/compiler.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const load = async (...parts) => JSON.parse(await readFile(path.join(root, ...parts), 'utf8'));

test('all published JSON schemas are syntactically valid and uniquely identified', async () => {
  const names = (await readdir(path.join(root, 'schemas'))).filter((name) => name.endsWith('.json'));
  assert.deepEqual(names.sort(), [
    'audit-event-v1.schema.json',
    'decision-v1.schema.json',
    'policy-v1.schema.json',
    'request-v1.schema.json',
  ]);
  const schemas = await Promise.all(names.map((name) => load('schemas', name)));
  assert.equal(new Set(schemas.map((schema) => schema.$id)).size, schemas.length);
  assert.ok(schemas.every((schema) => schema.$schema.includes('2020-12')));
});

test('published basic example evaluates to an L0 allow decision', async () => {
  const policy = compilePolicy(await load('examples', 'basic', 'policy.json'));
  const result = policy.evaluate(
    await load('examples', 'basic', 'request.json'),
    await load('examples', 'basic', 'context.json'),
  );
  assert.equal(result.decision, 'allow');
  assert.equal(result.enforcementLevel, 'L0');
});
