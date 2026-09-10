import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { BlackwallError } from '../errors.mjs';
import { createBlackwallApplication } from './application.mjs';

const uiDirectory = new URL('./ui/', import.meta.url);
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);

const securityHeaders = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
});

function digest(value) {
  return createHash('sha256').update(value).digest();
}

function send(response, status, body, contentType = 'application/json; charset=utf-8') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  response.writeHead(status, {
    ...securityHeaders,
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

async function readJson(request, limit = 65_536) {
  if (request.headers['content-type'] !== 'application/json') {
    const error = new Error('Content-Type must be application/json.');
    error.status = 415;
    throw error;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Request body is not valid JSON.');
    error.status = 400;
    throw error;
  }
}

export function createDashboardServer({
  application = createBlackwallApplication(),
  host = '127.0.0.1',
  port = 0,
  ownerToken = randomBytes(32).toString('hex'),
} = {}) {
  if (host !== '127.0.0.1' || !Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new TypeError('The dashboard must use a valid IPv4 loopback address and port.');
  }
  if (typeof ownerToken !== 'string' || ownerToken.length < 32) {
    throw new TypeError('The owner token must contain at least 32 characters.');
  }

  const expectedToken = digest(ownerToken);
  let origin;

  function isAuthorized(request) {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
    const candidate = digest(header.slice(7));
    return timingSafeEqual(candidate, expectedToken);
  }

  const server = createServer(async (request, response) => {
    try {
      if (!origin || request.headers.host !== new URL(origin).host) {
        send(response, 400, { error: 'Invalid host header.' });
        return;
      }
      const url = new URL(request.url, origin);
      const asset = assets.get(url.pathname);
      if (request.method === 'GET' && asset) {
        const [filename, contentType] = asset;
        send(response, 200, await readFile(new URL(filename, uiDirectory), 'utf8'), contentType);
        return;
      }
      if (url.pathname === '/health' && request.method === 'GET') {
        send(response, 200, { status: 'ok', enforcementLevel: 'L0' });
        return;
      }
      if (!url.pathname.startsWith('/api/')) {
        send(response, 404, { error: 'Not found.' });
        return;
      }
      if (request.headers.origin !== undefined && request.headers.origin !== origin) {
        send(response, 403, { error: 'Cross-origin request rejected.' });
        return;
      }
      if (!isAuthorized(request)) {
        send(response, 401, { error: 'Owner authentication required.' });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/status') {
        send(response, 200, application.status());
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/audit') {
        send(response, 200, { events: application.auditSnapshot() });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/sessions') {
        send(response, 201, application.createSession(await readJson(request)));
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/decisions') {
        const body = await readJson(request);
        if (!body || typeof body !== 'object' || Array.isArray(body) ||
            typeof body.capability !== 'string' || typeof body.frame !== 'string') {
          send(response, 400, { error: 'A capability and serialized frame are required.' });
          return;
        }
        send(response, 200, application.submit(body.capability, body.frame));
        return;
      }
      if (request.method === 'DELETE' && url.pathname.startsWith('/api/sessions/')) {
        const session = decodeURIComponent(url.pathname.slice('/api/sessions/'.length));
        const revoked = application.revokeSession(session);
        send(response, revoked ? 200 : 404, { revoked, session });
        return;
      }
      send(response, 404, { error: 'API route not found.' });
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status :
        error instanceof BlackwallError || error instanceof TypeError ? 400 : 500;
      send(response, status, {
        error: status === 500 ? 'Internal server error.' : error.message,
        ...(error instanceof BlackwallError ? { code: error.code } : {}),
      });
    }
  });

  async function start() {
    if (server.listening) throw new Error('Dashboard server is already running.');
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, resolve);
    });
    const address = server.address();
    origin = `http://${host}:${address.port}`;
    return Object.freeze({
      origin,
      dashboardUrl: `${origin}/#token=${encodeURIComponent(ownerToken)}`,
    });
  }

  async function stop() {
    if (!server.listening) return;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  return Object.freeze({ start, stop });
}
