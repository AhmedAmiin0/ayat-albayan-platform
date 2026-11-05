import { createHmac, timingSafeEqual } from 'node:crypto';

// A signed pair of uuids with an expiry: base64url(a | b | exp).signature. Binary body (16 + 16 + 4
// bytes) and a 128-bit signature keep it at 71 characters: Fastify refuses a path parameter over
// 100
// (maxParamLength) and a WhatsApp URL button carries it as its suffix. `context` separates the uses
// of one secret: a token made for one use never verifies for another (the feedback link signs with
// none, as it always did, so its live links stay valid).

const BODY_BYTES = 36;
const SIG_BYTES = 16;
const UUID_HEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface PairPayload {
  a: string;
  b: string;
  /** Unix seconds. */
  exp: number;
}

type PairCheck =
  | { ok: true; payload: PairPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

interface PairKey {
  secret: string;
  /** '' = none (the feedback link's historical signature). */
  context: string;
}

/** A context gets its own derived key (HMAC(secret, context)); none = the secret itself. */
const keyBytes = (key: PairKey): string | Buffer =>
  key.context === '' ? key.secret : createHmac('sha256', key.secret).update(key.context).digest();

const mac = (key: PairKey, body: string) =>
  createHmac('sha256', keyBytes(key))
    .update(body)
    .digest()
    .subarray(0, SIG_BYTES)
    .toString('base64url');
const uuidOf = (hex: string) =>
  `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
const uuidBytes = (id: string) => Buffer.from(id.replaceAll('-', ''), 'hex');

/** Throws on ids that are not lowercase uuids: only ids from the DB are signed. */
export function signPair(key: PairKey, p: PairPayload): string {
  if (!UUID_HEX.test(p.a) || !UUID_HEX.test(p.b)) throw new Error('signed token: not a uuid');
  const exp = Buffer.alloc(4);
  exp.writeUInt32BE(p.exp);
  const body = Buffer.concat([uuidBytes(p.a), uuidBytes(p.b), exp]).toString('base64url');
  return `${body}.${mac(key, body)}`;
}

/** The two parts of «body.sig»; null when it is not that shape. */
function split(token: string): { body: string; sig: string } | null {
  const parts = token.split('.');
  const [body = '', sig = ''] = parts;
  const shaped = parts.length === 2 && body !== '' && sig !== '';
  return shaped ? { body, sig } : null;
}

/** Constant time; different lengths are a mismatch without comparing. */
function signedBy(key: PairKey, t: { body: string; sig: string }): boolean {
  const given = Buffer.from(t.sig);
  const expected = Buffer.from(mac(key, t.body));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Signature first (constant time), then the shape and the expiry, so an unsigned token learns
 * nothing.
 */
export function verifyPair(key: PairKey, token: string, now: Date): PairCheck {
  const parts = split(token);
  if (!parts) return { ok: false, reason: 'malformed' };
  if (!signedBy(key, parts)) return { ok: false, reason: 'bad_signature' };
  const raw = Buffer.from(parts.body, 'base64url');
  if (raw.length !== BODY_BYTES) return { ok: false, reason: 'malformed' };
  const payload = {
    a: uuidOf(raw.subarray(0, 16).toString('hex')),
    b: uuidOf(raw.subarray(16, 32).toString('hex')),
    exp: raw.readUInt32BE(32),
  };
  return payload.exp * 1000 <= now.getTime()
    ? { ok: false, reason: 'expired' }
    : { ok: true, payload };
}
