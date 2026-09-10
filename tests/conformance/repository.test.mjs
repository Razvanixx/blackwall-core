import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const forbiddenExtensions = new Set(['.exe', '.dll', '.sys', '.pfx', '.p12', '.cvd', '.cld', '.zip']);
const forbiddenDirectories = new Set(['data', 'vendor', 'node_modules']);

async function files(directory, relative = '') {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const item = path.join(directory, entry.name);
    const itemRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) output.push(...await files(item, itemRelative));
    else output.push(itemRelative);
  }
  return output;
}

test('public tree excludes product artifacts and local user paths', async () => {
  const names = await files(root);
  assert.equal(names.some((name) => name.split(path.sep).some((part) => forbiddenDirectories.has(part))), false);
  assert.equal(names.some((name) => forbiddenExtensions.has(path.extname(name).toLowerCase())), false);

  for (const name of names.filter((item) => /\.(mjs|json|md|yml|yaml)$/.test(item))) {
    const text = await readFile(path.join(root, name), 'utf8');
    assert.doesNotMatch(text, /C:\\Users\\[^\\]+\\Documents\\Codex/i, name);
  }
});
