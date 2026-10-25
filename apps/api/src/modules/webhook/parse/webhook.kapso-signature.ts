import { createHmac } from 'node:crypto';
import { safeEqual } from './webhook.signature';

// Kapso webhook authentication (docs/19). Fails closed: no KAPSO_WEBHOOK_SECRET → every request is
// refused. Only the Kapso secret is tried here; the Meta route never tries it (and vice versa).

/** The signature headers this route reads, in lower case as Fastify gives them. */
export const KAPSO_SIGNATURE_HEADERS = ['x-webhook-signature', 'x-hub-signature-256'] as const;
type SignatureHeader = (typeof KAPSO_SIGNATURE_HEADERS)[number];

export interface KapsoSignedRequest {
  /** The exact bytes Kapso sent (req.rawBody); re-serialised JSON would not match. */
  rawBody: Buffer | undefined;
  /** The request's headers (only the two signature headers are read). */
  headers: Partial<Record<string, string | string[] | undefined>>;
  /** KAPSO_WEBHOOK_SECRET; undefined / blank = refuse everything. */
  secret: string | undefined;
}

const single = (v: string | string[] | undefined): string | undefined => (typeof v === 'string' ? v.trim().toLowerCase() : undefined);

/**
 * True when X-Webhook-Signature is the lowercase hex HMAC-SHA256 of the raw body with the Kapso
 * secret (Kapso's documented form), or X-Hub-Signature-256 is «sha256=» + that hex (a raw-Meta
 * forward). Constant-time compares; no secret, no body or no signature = false.
 */
export function verifyKapsoSignature({ rawBody, headers, secret }: KapsoSignedRequest): boolean {
  if (!rawBody || !secret || secret.trim() === '') return false;
  const hex = createHmac('sha256', secret).update(rawBody).digest('hex');
  const kapso = single(headers['x-webhook-signature']);
  const hub = single(headers['x-hub-signature-256']);
  return (kapso !== undefined && safeEqual(kapso, hex)) || (hub !== undefined && safeEqual(hub, `sha256=${hex}`));
}

/** For the 401 log: which signature header NAMES came, never their values. */
export function presentSignatureHeaders(headers: KapsoSignedRequest['headers']): SignatureHeader[] {
  return KAPSO_SIGNATURE_HEADERS.filter((name) => headers[name] !== undefined);
}
