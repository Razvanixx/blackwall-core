#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createDashboardServer } from './server.mjs';

const server = createDashboardServer({
  port: process.env.BLACKWALL_PORT === undefined ? 0 : Number(process.env.BLACKWALL_PORT),
});

try {
  const { dashboardUrl } = await server.start();
  console.log('Blackwall Core dashboard is running.');
  console.log(`Open this one-time local URL:\n${dashboardUrl}`);
  console.log('Press Ctrl+C to stop. Current enforcement level: L0 (simulation only).');
  if (process.argv.includes('--open')) {
    const launcher = process.platform === 'win32'
      ? ['explorer.exe', [dashboardUrl]]
      : ['xdg-open', [dashboardUrl]];
    const child = spawn(launcher[0], launcher[1], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  }
} catch (error) {
  console.error(`Blackwall failed to start: ${error.message}`);
  process.exitCode = 1;
}

async function shutdown() {
  await server.stop();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
