import { createHmac, timingSafeEqual } from 'node:crypto';

// Meta webhook authentication (R-MSG-04, docs/12 §3.5). Both checks fail closed: no secret or no
// token configured → every request is refused.

/** Constant-time string compare; unequal lengths are a plain false (timingSafeEqual throws). */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export interface SignedRequest {
  /** The exact bytes Meta sent (req.rawBody); re-serialised JSON would not match. */
  rawBody: Buffer | undefined;
  /** X-Hub-Signature-256: «sha256=<hex>». */
  header: string | undefined;
  /** WA_APP_SECRET. */
  secret: string | undefined;
}

/** True when X-Hub-Signature-256 is the HMAC-SHA256 of the raw body with the app secret. */
export function verifySignature({ rawBody, header, secret }: SignedRequest): boolean {
  if (!rawBody || !header || !secret) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return safeEqual(header.trim().toLowerCase(), expected);
}

export interface ChallengeQuery {
  mode?: string;
  token?: string;
  challenge?: string;
}

/** GET subscribe handshake: the challenge to echo back, or null (→ 403). */
export function verifyChallenge(q: ChallengeQuery, verifyToken: string | undefined): string | null {
  if (!verifyToken || q.mode !== 'subscribe' || !q.token || q.challenge === undefined) return null;
  return safeEqual(q.token, verifyToken) ? q.challenge : null;
}
