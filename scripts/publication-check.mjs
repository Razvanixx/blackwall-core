import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const checks = [];

async function requireNoPlaceholder(filename, pattern, message) {
  const text = await readFile(path.join(root, filename), 'utf8');
  checks.push({ name: filename, passed: !pattern.test(text), message });
}

await requireNoPlaceholder(
  '.github/ISSUE_TEMPLATE/config.yml',
  /github\.com\/OWNER\//,
  'Replace OWNER with the real GitHub account or organization.',
);
await requireNoPlaceholder(
  'MAINTAINERS.md',
  /Before public launch/,
  'List the real maintainer account before publication.',
);
const trademarkText = await readFile(path.join(root, 'TRADEMARKS.md'), 'utf8');
checks.push({
  name: 'TRADEMARKS.md',
  passed: /Status: provisional public branding/i.test(trademarkText),
  message: 'State clearly that public branding is provisional until name clearance is complete.',
});

const failed = checks.filter((check) => !check.passed);
console.log(JSON.stringify({ publicationReady: failed.length === 0, checks }, null, 2));
if (failed.length) process.exitCode = 2;
