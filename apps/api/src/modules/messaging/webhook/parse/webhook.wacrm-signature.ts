import { createHmac } from 'node:crypto';
import { safeEqual } from './webhook.signature';

// The academy CRM's webhook authentication (docs/19 «crm driver»). Fails closed: no WACRM_WEBHOOK_SECRET →
// every request is refused. Only that secret is tried here; the Meta and Kapso routes never try it.

/** A delivery signed longer ago (or further ahead) than this is a replay: refused. */
export const WACRM_TOLERANCE_MS = 5 * 60_000;

interface WacrmSignedRequest {
  /** The exact bytes the CRM sent (req.rawBody). */
  rawBody: Buffer | undefined;
  /** X-Wacrm-Signature: «t=<unix seconds>,v1=<hex>». */
  header: string | undefined;
  /** WACRM_WEBHOOK_SECRET; undefined / blank = refuse everything. */
  secret: string | undefined;
  now: Date;
}

/** ok, or why not: bad (no secret / body / header, malformed, wrong HMAC) or stale (t outside 5 minutes). */
type WacrmVerdict = 'ok' | 'bad' | 'stale';

/** The t and v1 parts, in any order; null when either is missing or malformed. */
export function signatureParts(header: string): { t: string; v1: string } | null {
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=', 2) as [string, string | undefined]));
  const t = parts['t'];
  const v1 = parts['v1']?.toLowerCase();
  return t && /^\d{1,12}$/.test(t) && v1 && /^[0-9a-f]{64}$/.test(v1) ? { t, v1 } : null;
}

/** v1 = hex HMAC-SHA256(secret, `${t}.${rawBody}`), compared in constant time, and t within 5 minutes of now. */
export function verifyWacrmSignature(req: WacrmSignedRequest): WacrmVerdict {
  const { rawBody, secret } = req;
  if (!rawBody || !secret || secret.trim() === '' || !req.header) return 'bad';
  const parts = signatureParts(req.header);
  if (!parts) return 'bad';
  const expected = createHmac('sha256', secret).update(`${parts.t}.`).update(rawBody).digest('hex');
  if (!safeEqual(parts.v1, expected)) return 'bad';
  return Math.abs(req.now.getTime() - Number(parts.t) * 1000) <= WACRM_TOLERANCE_MS ? 'ok' : 'stale';
}
