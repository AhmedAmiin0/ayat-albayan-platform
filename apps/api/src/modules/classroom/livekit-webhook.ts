import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { LivekitEnv } from '../../env';

// LiveKit signs every webhook POST with a JWT in the Authorization header (no "Bearer"): HS256
// with the API secret, iss = API key, and a `sha256` claim = base64 (standard) of sha256(body).

const SKEW_S = 60;

export interface WebhookCheck {
  rawBody: Buffer | undefined;
  authorization: string | undefined;
  config: Pick<LivekitEnv, 'apiKey' | 'apiSecret'>;
  now: Date;
}

const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

function claimsOf(part: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The claims of an HS256 token signed with `secret`; null when the signature does not hold. */
function signedClaims(token: string, secret: string): Record<string, unknown> | null {
  const [head = '', body = '', sig = ''] = token.split('.');
  if (claimsOf(head)?.alg !== 'HS256') return null;
  const expected = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return safeEqual(sig, expected) ? claimsOf(body) : null;
}

/** Within nbf..exp (a minute of clock skew either way); absent bounds do not bind. */
function fresh(claims: Record<string, unknown>, now: Date): boolean {
  const nowS = Math.floor(now.getTime() / 1000);
  const exp = typeof claims.exp === 'number' ? claims.exp : Infinity;
  const nbf = typeof claims.nbf === 'number' ? claims.nbf : -Infinity;
  return exp + SKEW_S >= nowS && nbf - SKEW_S <= nowS;
}

/** Is this POST really from our LiveKit, about exactly these bytes, and still fresh? */
export function verifyWebhook(input: WebhookCheck): boolean {
  const token = input.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!input.rawBody || !token) return false;
  const claims = signedClaims(token, input.config.apiSecret);
  if (!claims || claims.iss !== input.config.apiKey || !fresh(claims, input.now)) return false;
  const digest = createHash('sha256').update(input.rawBody).digest('base64');
  return typeof claims.sha256 === 'string' && safeEqual(claims.sha256, digest);
}

/** What an egress event means for its lesson_recordings row; null = nothing to change. */
export interface EgressOutcome {
  egressId: string;
  status: 'done' | 'failed';
  endedAt: string;
  error: string | null;
  /** The egress' room (`lesson-<id>` / `meeting-<id>`), to record again if people are still in it. */
  room: string | null;
}

const DONE = new Set(['EGRESS_COMPLETE', 'EGRESS_LIMIT_REACHED', '3', '6']);
const FAILED = new Set(['EGRESS_FAILED', 'EGRESS_ABORTED', '4', '5']);
const NS_PER_MS = 1_000_000n;

const str = (v: unknown): string | null => (typeof v === 'string' || typeof v === 'number' ? String(v) : null);

/** endedAt is Unix nanoseconds (a JSON string); falls back to `now`. */
function endedAtOf(v: unknown, now: Date): string {
  const s = str(v);
  if (!s || !/^\d+$/.test(s) || s === '0') return now.toISOString();
  return new Date(Number(BigInt(s) / NS_PER_MS)).toISOString();
}

const kindOf = (status: string): EgressOutcome['status'] | null => (DONE.has(status) ? 'done' : FAILED.has(status) ? 'failed' : null);

/** The EgressInfo of an egress_ended / egress_updated event, else null. */
function egressInfoOf(event: unknown): Record<string, unknown> | null {
  if (!event || typeof event !== 'object') return null;
  const e = event as Record<string, unknown>;
  if (e.event !== 'egress_ended' && e.event !== 'egress_updated') return null;
  const info = e.egressInfo ?? e.egress_info;
  return info && typeof info === 'object' ? (info as Record<string, unknown>) : null;
}

/** egress_ended / egress_updated with a terminal status; camelCase (LiveKit) and snake_case read. */
export function egressOutcome(event: unknown, now: Date): EgressOutcome | null {
  const info = egressInfoOf(event) ?? {};
  const egressId = str(info.egressId ?? info.egress_id);
  const status = str(info.status) ?? '';
  const kind = kindOf(status);
  if (!egressId || !kind) return null;
  const error = kind === 'failed' ? (str(info.error) ?? status).slice(0, 500) : null;
  const room = str(info.roomName ?? info.room_name);
  return { egressId, status: kind, endedAt: endedAtOf(info.endedAt ?? info.ended_at, now), error, room };
}
