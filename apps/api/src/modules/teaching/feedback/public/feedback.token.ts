import { createHash } from 'node:crypto';
import { signPair, verifyPair } from '@/common/http/pair-token';

// Stateless to verify (docs/13); token_hash on the row makes a link revocable by a resend.

/** Link lifetime. */
const FEEDBACK_TTL_DAYS = 14;
const DAY_S = 86_400;

export interface TokenPayload {
  lessonId: string;
  studentId: string;
  /** Unix seconds. */
  exp: number;
}

type TokenCheck =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

/** No context: the signature every live feedback link already carries. */
const keyOf = (secret: string) => ({ secret, context: '' });

/** Expiry in unix seconds for a link issued at `now`. */
export const expiryOf = (now: Date): number => Math.floor(now.getTime() / 1000) + FEEDBACK_TTL_DAYS * DAY_S;

/** Throws on ids that are not lowercase uuids: only ids from the DB are signed. */
export function signToken(secret: string, p: TokenPayload): string {
  return signPair(keyOf(secret), { a: p.lessonId, b: p.studentId, exp: p.exp });
}

/**
 * Signature first (constant time), then the shape and the expiry, so an unsigned token learns
 * nothing.
 */
export function verifyToken(secret: string, token: string, now: Date): TokenCheck {
  const r = verifyPair(keyOf(secret), token, now);
  if (!r.ok) return r;
  return { ok: true, payload: { lessonId: r.payload.a, studentId: r.payload.b, exp: r.payload.exp } };
}

/** What the DB keeps: the token itself is never stored. */
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
