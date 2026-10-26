import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// The OAuth `state` (CSRF): base64url({ u: admin id, n: nonce, e: expiry }) + '.' + HMAC-SHA256.
// The HMAC key is derived from the server's service key (never sent anywhere); the nonce's sha256
// is kept on google_account, single use, so a state works once, for the admin who started it,
// for 10 minutes.

export const STATE_TTL_MS = 10 * 60_000;

interface StatePayload {
  u: string;
  n: string;
  e: number;
}

const b64 = (buf: Buffer | string): string => Buffer.from(buf).toString('base64url');
export const stateKey = (secret: string): Buffer => createHmac('sha256', secret).update('google-oauth-state:v1').digest();
const sign = (body: string, key: Buffer): string => b64(createHmac('sha256', key).update(body).digest());
export const nonceHash = (nonce: string): string => createHash('sha256').update(nonce).digest('hex');

/** A new state for `userId`, valid until now + 10 minutes. */
export function newState(input: { userId: string; key: Buffer; now: number }): { state: string; nonce: string; expiresAt: Date } {
  const nonce = randomBytes(24).toString('base64url');
  const payload: StatePayload = { u: input.userId, n: nonce, e: input.now + STATE_TTL_MS };
  const body = b64(JSON.stringify(payload));
  return { state: `${body}.${sign(body, input.key)}`, nonce, expiresAt: new Date(payload.e) };
}

/** The payload of a well-signed, unexpired state, or null. */
export function readState(input: { state: string; key: Buffer; now: number }): StatePayload | null {
  const [body, mac, extra] = input.state.split('.');
  if (!body || !mac || extra !== undefined) return null;
  const want = Buffer.from(sign(body, input.key));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<StatePayload>;
    if (typeof p.u !== 'string' || typeof p.n !== 'string' || typeof p.e !== 'number') return null;
    return p.e > input.now ? { u: p.u, n: p.n, e: p.e } : null;
  } catch {
    return null;
  }
}
