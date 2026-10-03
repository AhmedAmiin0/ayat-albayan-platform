import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// The signed «رأيك يهمّنا» link: base64url(lessonId | studentId | exp).signature (docs/13). Binary
// body (16 + 16 + 4 bytes) and a 128-bit signature keep it at 71 characters: Fastify refuses a path
// parameter over 100 (maxParamLength) and WhatsApp's URL button carries it as its suffix.
// Stateless to verify; lesson_feedback.token_hash is what makes a link revocable (a resend stores a
// new hash, so the old link no longer finds its row).

/** Link lifetime. */
export const FEEDBACK_TTL_DAYS = 14;
const DAY_S = 86_400;
const BODY_BYTES = 36;
const SIG_BYTES = 16;
const UUID_HEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface TokenPayload {
  lessonId: string;
  studentId: string;
  /** Unix seconds. */
  exp: number;
}

export type TokenCheck =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

const mac = (secret: string, body: string) =>
  createHmac('sha256', secret).update(body).digest().subarray(0, SIG_BYTES).toString('base64url');
const uuidOf = (hex: string) => `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

/** Expiry in unix seconds for a link issued at `now`. */
export const expiryOf = (now: Date): number => Math.floor(now.getTime() / 1000) + FEEDBACK_TTL_DAYS * DAY_S;

/** Throws on ids that are not lowercase uuids: only ids from the DB are signed. */
export function signToken(secret: string, p: TokenPayload): string {
  if (!UUID_HEX.test(p.lessonId) || !UUID_HEX.test(p.studentId)) throw new Error('feedback token: not a uuid');
  const exp = Buffer.alloc(4);
  exp.writeUInt32BE(p.exp);
  const body = Buffer.concat([
    Buffer.from(p.lessonId.replaceAll('-', ''), 'hex'),
    Buffer.from(p.studentId.replaceAll('-', ''), 'hex'),
    exp,
  ]).toString('base64url');
  return `${body}.${mac(secret, body)}`;
}

/** Signature first (constant time), then the shape and the expiry, so an unsigned token learns nothing. */
export function verifyToken(secret: string, token: string, now: Date): TokenCheck {
  const parts = token.split('.');
  const [body, sig] = parts;
  if (parts.length !== 2 || !body || !sig) return { ok: false, reason: 'malformed' };
  const given = Buffer.from(sig);
  const expected = Buffer.from(mac(secret, body));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad_signature' };
  }
  const raw = Buffer.from(body, 'base64url');
  if (raw.length !== BODY_BYTES) return { ok: false, reason: 'malformed' };
  const payload = {
    lessonId: uuidOf(raw.subarray(0, 16).toString('hex')),
    studentId: uuidOf(raw.subarray(16, 32).toString('hex')),
    exp: raw.readUInt32BE(32),
  };
  return payload.exp * 1000 <= now.getTime() ? { ok: false, reason: 'expired' } : { ok: true, payload };
}

/** What the DB keeps: the token itself is never stored. */
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
