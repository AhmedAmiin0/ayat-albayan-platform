import { isWaLine, type NumberSecretName, type WaLine } from '@ab/shared';
import type { CallsNumber } from '@/common/configuration/integrations/calls-number';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import {
  validOverlay,
  type Env,
  type KapsoLineEnv,
  type WhatsappEnv,
} from '@/config/env/env';
import { ROLE_KEYS } from '@/modules/messaging/numbers/lines/numbers.lines';
import type { NumberRow } from '@/modules/messaging/numbers/numbers.repo';

// One number's own client config (docs/23 phase 5, docs/23c decision 3): the row's ids and ITS Vault
// secrets only. A number never borrows another number's token or a legacy WA_* key (PR #142 item 15).
// The shared pieces come from the config: meta = WA_API_BASE / WA_API_VERSION; kapso = KAPSO_API_BASE,
// KAPSO_API_VERSION and the project-wide KAPSO_API_KEY (env.kapso.ts kapsoLine); crm = WACRM_API_BASE and
// WACRM_API_KEY (env.crm.ts crmLine). Never logs a value.

interface NumberSource {
  row: NumberRow;
  secrets: Partial<Record<NumberSecretName, string>>;
}

/** The row's sending values checked against their env schema keys; null = one of them is invalid. */
function checked({ row, secrets }: NumberSource, line: WaLine): Record<string, string> | null {
  const k = ROLE_KEYS[line];
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
 * or a value that fails the env schema (the row stays queued, like an unconfigured line). A `calls`
 * number never sends a message (docs/28 §10): always null here, so no route or fallback can pick
 * it.
 */
export function numberEnv(source: NumberSource, env: Env): WhatsappEnv | null {
  const line = source.row.purpose;
  if (!isWaLine(line)) return null;
  const v = source.row.enabled ? checked(source, line) : null;
  if (!v) return null;
  const k = ROLE_KEYS[line];
  // crm: the CRM's base + key (env.crm.ts crmLine); the row's ids only name it, they are never sent.
  if (v[k.provider] === 'crm') return crmEnv(env);
  const phoneNumberId = v[k.phone_number_id];
  const wabaId = v[k.waba_id];
  if (!phoneNumberId || !wabaId) return null;
  const ids = { phoneNumberId, wabaId };
  return v[k.provider] === 'kapso' ? kapsoEnv(ids, env) : metaEnv({ ids, token: v[k.access_token], appId: v[k.app_id] }, env);
}

type Ids = { phoneNumberId: string; wabaId: string };

/** Kapso: its base and version, the project key; never a Meta token or app id. */
function kapsoEnv(ids: Ids, env: Env): KapsoLineEnv | null {
  const base = env.KAPSO_API_BASE?.replace(/\/+$/, '');
  const apiKey = env.KAPSO_API_KEY;
  if (!base || !apiKey) return null;
  return { provider: 'kapso', base, version: env.KAPSO_API_VERSION, ...ids, apiKey };
}

/** The CRM: WACRM_API_BASE and the account-wide WACRM_API_KEY, like Kapso's project key; never a Meta token. */
function crmEnv(env: Env): WhatsappEnv | null {
  const base = env.WACRM_API_BASE?.replace(/\/+$/, '');
  const apiKey = env.WACRM_API_KEY;
  return base && apiKey ? { provider: 'crm', base, apiKey } : null;
}

/** Meta: WA_API_BASE / WA_API_VERSION with the number's own token (app id only when set). */
function metaEnv(own: { ids: Ids; token?: string; appId?: string }, env: Env): WhatsappEnv | null {
  const base = env.WA_API_BASE?.replace(/\/+$/, '');
  if (!base || !own.token) return null;
  const conn = { base, version: env.WA_API_VERSION, ...own.ids, accessToken: own.token };
  return own.appId ? { ...conn, appId: own.appId } : conn;
}

/**
 * Its own app secret (webhook signatures), when set and valid; never another number's (a calls
 * number: Kapso's).
 */
function appSecretOf({ row, secrets }: NumberSource): string | null {
  if (!isWaLine(row.purpose)) return null;
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

/**
 * The calls number as callingLine() rings it (docs/28 §10): Kapso only, its ids and the project
 * key; env null = it cannot carry a call now (not kapso, no WABA id, no Kapso base / key).
 */
export function callsNumberOf(row: NumberRow, env: Env): CallsNumber {
  const ids =
    row.provider === 'kapso' && row.waba_id
      ? { phoneNumberId: row.phone_number_id, wabaId: row.waba_id }
      : null;
  return { id: row.id, phoneNumberId: row.phone_number_id, env: ids ? kapsoEnv(ids, env) : null };
}
