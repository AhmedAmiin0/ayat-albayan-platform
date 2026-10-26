import { createHmac, timingSafeEqual } from 'node:crypto';

// Meta webhook authentication (R-MSG-04, docs/12 §3.5). Both checks fail closed: no secret or no
// token configured → every request is refused.

/** Constant-time string compare; unequal lengths are a plain false (timingSafeEqual throws). */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** «sha256=<hex>» of the raw body with one app secret. */
function signatureOf(rawBody: Buffer, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

export interface SignedRequest {
  /** The exact bytes Meta sent (req.rawBody); re-serialised JSON would not match. */
  rawBody: Buffer | undefined;
  /** X-Hub-Signature-256: «sha256=<hex>». */
  header: string | undefined;
  /** [WA_APP_SECRET, WA_CHAT_APP_SECRET] (docs/12 §13.6); undefined / blank entries are ignored. */
  secrets: readonly (string | undefined)[];
}

/**
 * True when X-Hub-Signature-256 is the HMAC-SHA256 of the raw body with ANY of the app secrets
 * (one per Meta app / line). No usable secret, no raw body or no header = false (fail closed).
 */
export function verifySignature({ rawBody, header, secrets }: SignedRequest): boolean {
  if (!rawBody || !header) return false;
  const given = header.trim().toLowerCase();
  const usable = secrets.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
  return usable.some((secret) => safeEqual(given, signatureOf(rawBody, secret)));
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
