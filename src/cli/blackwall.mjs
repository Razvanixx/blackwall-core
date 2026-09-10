#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import process from 'node:process';
import { compilePolicy } from '../policy/compiler.mjs';

async function parseJson(filename) {
  const info = await stat(filename);
  if (!info.isFile() || info.size > 1_048_576) throw new Error('Input must be a regular file up to 1 MiB.');
  const text = await readFile(filename, 'utf8');
  if (Buffer.byteLength(text, 'utf8') > 1_048_576) throw new Error('Input file exceeds 1 MiB.');
  return JSON.parse(text);
}

async function main() {
  const [command, policyFile, requestFile, contextFile] = process.argv.slice(2);
  if (command === 'demo') {
    const now = Date.now();
    const policy = compilePolicy({
      version: 1,
      policyId: 'demo-policy',
      grants: [
        {
          id: 'read-input',
          principal: 'demo-agent',
          session: 'demo-session',
          action: 'file.read',
          resource: { path: 'C:\\AgentWork\\input.txt' },
          expiresAt: new Date(now + 60_000).toISOString(),
        },
      ],
    });
    const context = {
      principal: 'demo-agent',
      session: 'demo-session',
      now,
      revokedGrantIds: [],
    };
    const approved = policy.evaluate(
      { action: 'file.read', resource: { path: 'C:\\AgentWork\\input.txt' } },
      context,
    );
    const denied = policy.evaluate(
      { action: 'file.read', resource: { path: 'C:\\Users\\Public\\secret.txt' } },
      context,
    );
    console.log(JSON.stringify({ status: 'simulation-only', approved, denied }, null, 2));
    return;
  }

  if (command !== 'evaluate' || !policyFile || !requestFile || !contextFile) {
    throw new Error('Usage: blackwall demo | blackwall evaluate <policy.json> <request.json> <context.json>');
  }
  const policy = compilePolicy(await parseJson(policyFile));
  const result = policy.evaluate(await parseJson(requestFile), await parseJson(contextFile));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.decision === 'allow' ? 0 : 2;
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'error', code: error.code ?? 'BW_CLI_ERROR', message: error.message }));
  process.exitCode = 1;
});
