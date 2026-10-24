import type { NumberSecretName } from '@ab/shared';
import type { OverlayNumber } from '../../common/integrations/numbers-overlay';
import { validOverlay, type Env, type WhatsappEnv } from '../../env';
import { ROLE_KEYS } from './numbers.lines';
import type { NumberRow } from './numbers.queries';

// One number's own client config (docs/23 phase 5, docs/23c decision 3): the row's ids and ITS Vault
// secrets only. A number never borrows another number's token or a legacy WA_* key (PR #142 item 15).
// The shared pieces come from the config: meta = WA_API_BASE / WA_API_VERSION; kapso = KAPSO_API_BASE,
// KAPSO_API_VERSION and the project-wide KAPSO_API_KEY (env.kapso.ts kapsoLine). Never logs a value.

export interface NumberSource {
  row: NumberRow;
  secrets: Partial<Record<NumberSecretName, string>>;
}

/** The row's sending values checked against their env schema keys; null = one of them is invalid. */
function checked({ row, secrets }: NumberSource): Record<string, string> | null {
  const k = ROLE_KEYS[row.purpose];
  let bad = false;
  const raw = {
    [k.provider]: row.provider,
    [k.phone_number_id]: row.phone_number_id,
    [k.waba_id]: row.waba_id ?? '',
    [k.app_id]: row.app_id ?? '',
    [k.access_token]: secrets.access_token ?? '',
  };
  const values = validOverlay(raw, () => {
    bad = true;
  });
  return bad ? null : values;
}

/**
 * What this number sends with; null = it cannot send: disabled, an id / token / base / key missing,
 * or a value that fails the env schema (the row stays queued, like an unconfigured line).
 */
export function numberEnv(source: NumberSource, env: Env): WhatsappEnv | null {
  const v = source.row.enabled ? checked(source) : null;
  if (!v) return null;
  const k = ROLE_KEYS[source.row.purpose];
  const phoneNumberId = v[k.phone_number_id];
  const wabaId = v[k.waba_id];
  if (!phoneNumberId || !wabaId) return null;
  const ids = { phoneNumberId, wabaId };
  return v[k.provider] === 'kapso' ? kapsoEnv(ids, env) : metaEnv({ ids, token: v[k.access_token], appId: v[k.app_id] }, env);
}

type Ids = { phoneNumberId: string; wabaId: string };

/** Kapso: its base and version, the project key; never a Meta token or app id. */
function kapsoEnv(ids: Ids, env: Env): WhatsappEnv | null {
  const base = env.KAPSO_API_BASE?.replace(/\/+$/, '');
  const apiKey = env.KAPSO_API_KEY;
  if (!base || !apiKey) return null;
  return { provider: 'kapso', base, version: env.KAPSO_API_VERSION, ...ids, apiKey };
}

/** Meta: WA_API_BASE / WA_API_VERSION with the number's own token (app id only when set). */
function metaEnv(own: { ids: Ids; token?: string; appId?: string }, env: Env): WhatsappEnv | null {
  const base = env.WA_API_BASE?.replace(/\/+$/, '');
  if (!base || !own.token) return null;
  const conn = { base, version: env.WA_API_VERSION, ...own.ids, accessToken: own.token };
  return own.appId ? { ...conn, appId: own.appId } : conn;
}

/** Its own app secret (webhook signatures), when set and valid; never another number's. */
function appSecretOf({ row, secrets }: NumberSource): string | null {
  const key = ROLE_KEYS[row.purpose].app_secret;
  return validOverlay({ [key]: secrets.app_secret ?? '' }, () => undefined)[key] ?? null;
}

/** A wa_numbers row as the overlay carries it (enabled or not: inbound on an off number is still logged). */
export function overlayNumber(source: NumberSource, env: Env): OverlayNumber {
  const { row } = source;
  return {
    id: row.id,
    label: row.label,
    purpose: row.purpose,
    phone_number_id: row.phone_number_id,
    waba_id: row.waba_id,
    enabled: row.enabled,
    is_default: row.is_default,
    fallback_rank: row.fallback_rank,
    created_at: row.created_at,
    env: numberEnv(source, env),
    appSecret: appSecretOf(source),
  };
}
