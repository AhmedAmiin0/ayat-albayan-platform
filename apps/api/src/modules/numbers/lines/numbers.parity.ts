import { SECRET_PARITY_FIELDS, WA_LINES, type ParityCell, type ParityField, type ParityRoleView, type ParityView, type WaLine } from '@ab/shared';
import { lineEnvs, lineNumbers, lineProvider, type Env, type WhatsappEnv } from '../../../config/env/env';

// GET /admin/communications/parity (docs/23 §2e step 4): per role, the effective config the legacy path
// and the module path would use, field by field. Secrets are compared in memory and shown only as
// 'set' / null with a state; their values never leave this file.

type Facts = Record<ParityField, string | null>;

function tokenOf(line: WhatsappEnv): string {
  return 'accessToken' in line ? line.accessToken : line.apiKey;
}

type LineFacts = Pick<Facts, 'phone_number_id' | 'waba_id' | 'app_id' | 'api_base' | 'api_version' | 'access_token'>;

function lineFacts(line: WhatsappEnv | null): LineFacts {
  if (!line) return { phone_number_id: null, waba_id: null, app_id: null, api_base: null, api_version: null, access_token: null };
  // A crm line has no ids or version of ours (docs/19): its base and key only.
  if (line.provider === 'crm') return { phone_number_id: null, waba_id: null, app_id: null, api_base: line.base, api_version: null, access_token: line.apiKey };
  return {
    phone_number_id: line.phoneNumberId,
    waba_id: line.wabaId,
    app_id: line.provider === 'kapso' ? null : (line.appId ?? null),
    api_base: line.base,
    api_version: line.version,
    access_token: tokenOf(line),
  };
}

function factsOf(env: Env, role: WaLine): Facts {
  const line = lineEnvs(env)[role];
  const appSecret = role === 'chat' ? env.WA_CHAT_APP_SECRET : env.WA_APP_SECRET;
  return {
    configured: String(line !== null),
    provider: lineProvider(env, role),
    ...lineFacts(line),
    app_secret: appSecret ?? null,
    webhook_phone_number_id: lineNumbers(env)[role] ?? null,
  };
}

function cell(field: ParityField, a: string | null, b: string | null): ParityCell {
  const state = a === b ? 'same' : a === null || b === null ? 'missing' : 'different';
  const secret = SECRET_PARITY_FIELDS.includes(field);
  const shown = (v: string | null) => (secret ? (v === null ? null : 'set') : v);
  return { field, state, legacy: shown(a), module: shown(b) };
}

/** A role's app secret matters only where that role receives (has a webhook phone id) on either side. */
function relevant(field: ParityField, legacy: Facts, module: Facts): boolean {
  return field !== 'app_secret' || legacy.webhook_phone_number_id !== null || module.webhook_phone_number_id !== null;
}

export interface ParityInput {
  legacy: Env;
  module: Env;
  /** The role's default enabled number (module side), for the labels. */
  numbers: Partial<Record<WaLine, { id: string; label: string }>>;
}

export function parityRoles(input: ParityInput): ParityRoleView[] {
  return WA_LINES.map((role) => {
    const a = factsOf(input.legacy, role);
    const b = factsOf(input.module, role);
    const fields = (Object.keys(a) as ParityField[]).filter((f) => relevant(f, a, b)).map((f) => cell(f, a[f], b[f]));
    const n = input.numbers[role];
    return { role, number_id: n?.id ?? null, number_label: n?.label ?? null, fields };
  });
}

/** Every non-same cell; the switch to module is refused while this is non-empty. */
export function differences(roles: readonly ParityRoleView[]): ParityView['differences'] {
  return roles.flatMap((r) =>
    r.fields.flatMap((c) => (c.state === 'same' ? [] : [{ role: r.role, field: c.field, state: c.state }])),
  );
}
