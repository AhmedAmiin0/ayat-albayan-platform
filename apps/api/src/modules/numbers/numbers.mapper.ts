import { WA_PROVIDERS, type LineCheckView, type NumberHealth, type NumberView, type WaProvider } from '@ab/shared';
import type { Json } from '@ab/db';
import { displayE164 } from '../whatsapp/lines/line-health.store';
import type { NumberRow } from './numbers.queries';
import type { SecretStatus } from './numbers.secrets';

const providerOf = (p: string): WaProvider => WA_PROVIDERS.find((k) => k === p) ?? 'meta';

const isRecord = (v: Json | null): v is Record<string, Json | undefined> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: Json | undefined): string | null => (typeof v === 'string' ? v : null);

/** The stored health jsonb → its view (unknown shapes read as null fields). */
export function healthOf(raw: Json | null): NumberHealth | null {
  if (!isRecord(raw)) return null;
  const gaps = Array.isArray(raw.gaps) ? raw.gaps.filter((g): g is string => typeof g === 'string') : [];
  return {
    ok: raw.ok === true,
    status: str(raw.status),
    quality_rating: str(raw.quality_rating),
    verified_name: str(raw.verified_name),
    gaps,
    errors: typeof raw.errors === 'number' ? raw.errors : 0,
  };
}

export function numberView(row: NumberRow, status: SecretStatus): NumberView {
  const s = status.get(row.id) ?? {};
  const state = (at: string | undefined) => ({ set: at !== undefined, updated_at: at ?? null });
  return {
    id: row.id,
    label: row.label,
    purpose: row.purpose,
    provider: providerOf(row.provider),
    phone_number_id: row.phone_number_id,
    waba_id: row.waba_id,
    app_id: row.app_id,
    display_phone_e164: row.display_phone_e164,
    enabled: row.enabled,
    is_default: row.is_default,
    fallback_rank: row.fallback_rank,
    health: healthOf(row.health),
    checked_at: row.checked_at,
    updated_at: row.updated_at,
    secrets: { access_token: state(s.access_token), app_secret: state(s.app_secret) },
  };
}

/** The health view as the jsonb column stores it. */
export function healthJson(h: NumberHealth): Json {
  return { ok: h.ok, status: h.status, quality_rating: h.quality_rating, verified_name: h.verified_name, gaps: [...h.gaps], errors: h.errors };
}

/** One line check → what its phone id's rows keep (no token; the number only when the call answered). */
export function healthFromCheck(v: LineCheckView): { health: NumberHealth; checked_at: string; display_phone_e164?: string } {
  const e164 = displayE164(v.display_phone_number);
  const health: NumberHealth = {
    ok: e164 !== null,
    status: v.status,
    quality_rating: v.quality_rating,
    verified_name: v.verified_name?.slice(0, 200) ?? null,
    gaps: v.gaps,
    errors: v.errors.length,
  };
  return { health, checked_at: v.checked_at, ...(e164 ? { display_phone_e164: e164 } : {}) };
}
