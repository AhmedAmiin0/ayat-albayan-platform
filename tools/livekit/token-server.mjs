// Meeting-link token service: POST /test/token {c, name?} -> {token}. A valid code (the secret
// in the meeting link) mints a join token with a fresh identity, so every window is its own
// participant. Rotate the link by changing MEETING_CODE in .env and restarting the container.
import { createServer } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const { LIVEKIT_API_KEY: KEY, LIVEKIT_API_SECRET: SECRET, MEETING_CODE: CODE, MEETING_ROOM: ROOM = 'test' } = process.env;
if (!KEY || !SECRET || !CODE) throw new Error('LIVEKIT_API_KEY, LIVEKIT_API_SECRET and MEETING_CODE are required');
const TTL = 6 * 3600;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function mint(name) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({
    iss: KEY, sub: `p-${randomBytes(4).toString('hex')}`, name, nbf: now - 10, exp: now + TTL,
    video: { roomJoin: true, room: ROOM, canPublish: true, canSubscribe: true, canPublishData: true },
  });
  return `${head}.${body}.${createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url')}`;
}

createServer((req, res) => {
  const send = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST' || req.url !== '/test/token') return send(404, { error: 'not_found' });
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 2000) req.destroy(); });
  req.on('end', () => {
    let input = {};
    try { input = JSON.parse(raw); } catch { /* falls through to 403 */ }
    if (typeof input.c !== 'string' || !same(input.c, CODE)) return send(403, { error: 'bad_code' });
    const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 30) : 'ضيف';
    send(200, { token: mint(name) });
  });
}).listen(7890, '127.0.0.1');
