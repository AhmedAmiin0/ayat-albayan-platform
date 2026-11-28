import { safeEqual } from '@/common/infra/crypto/safe-equal';
import { hmacSha256Hex } from '@/common/infra/crypto/hmac';

// The academy CRM's webhook authentication (docs/19 «crm driver»). Fails closed: no
// WACRM_WEBHOOK_SECRET → every request is refused. Only that secret is tried here; the Meta and
// Kapso routes never try it.

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

/**
 * ok, or why not: bad (no secret / body / header, malformed, wrong HMAC) or stale (t outside 5
 * minutes).
 */
type WacrmVerdict = 'ok' | 'bad' | 'stale';

/** The t and v1 parts, in any order; null when either is missing or malformed. */
export function signatureParts(header: string): { t: string; v1: string } | null {
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.trim().split('=', 2) as [string, string | undefined]),
  );
  const t = parts.t;
  const v1 = parts.v1?.toLowerCase();
  return t && /^\d{1,12}$/.test(t) && v1 && /^[0-9a-f]{64}$/.test(v1) ? { t, v1 } : null;
}

const setSecret = (secret: string | undefined): string | null =>
  secret !== undefined && secret.trim() !== '' ? secret : null;

/** The signed t when v1 = hex HMAC-SHA256(secret, `${t}.${rawBody}`) (constant time); else null. */
function signedAt(req: WacrmSignedRequest): string | null {
  const secret = setSecret(req.secret);
  const parts = req.header ? signatureParts(req.header) : null;
  if (!req.rawBody || !secret || !parts) return null;
  const expected = hmacSha256Hex(secret, [`${parts.t}.`, req.rawBody]);
  return safeEqual(parts.v1, expected) ? parts.t : null;
}

/** A valid signature whose t is within 5 minutes of now. */
export function verifyWacrmSignature(req: WacrmSignedRequest): WacrmVerdict {
  const t = signedAt(req);
  if (t === null) return 'bad';
  return Math.abs(req.now.getTime() - Number(t) * 1000) <= WACRM_TOLERANCE_MS ? 'ok' : 'stale';
}
