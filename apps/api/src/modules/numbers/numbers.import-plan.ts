import {
  IMPORT_FIELDS, NUMBER_SECRET_NAMES, WA_LINES, type ImportField, type ImportFieldView, type ImportRoleView,
  type IntegrationKey, type IntegrationSource, type NumberSecretName, type WaLine,
} from '@ab/shared';
import { lineNumbers, lineProvider, type Env } from '../../env';
import { ROLE_KEYS } from './numbers.lines';
import type { NumberRow } from './numbers.queries';
import type { SecretStatus } from './numbers.secrets';

// The import's plan (docs/23 §2e step 2), pure: per role, today's effective values and where each comes
// from (DB = «التكاملات», env = the server), never a secret value. A role is imported when the legacy
// config gives it a phone id of its own; a row with that phone id already there is left as it is.

export interface PlanInput {
  /** The legacy env (integration overlay on process.env, no numbers). */
  legacy: Env;
  /** The DB values in use (the integration overlay) and the server env: only their presence is read. */
  db: Readonly<Record<string, string>>;
  env: NodeJS.ProcessEnv;
  rows: readonly NumberRow[];
  status: SecretStatus;
}

export interface RolePlan extends ImportRoleView {
  /** Where each secret to copy comes from: the legacy key and its store. */
  copies: { name: NumberSecretName; key: IntegrationKey; source: 'db' | 'env' }[];
  row: { provider: string; phone_number_id: string; waba_id: string | null; app_id: string | null } | null;
}

const present = (v: string | undefined): boolean => v !== undefined && v.trim() !== '';

function sourceOf(input: PlanInput, key: IntegrationKey): IntegrationSource {
  if (present(input.db[key])) return 'db';
  return present(input.env[key]) ? 'env' : 'unset';
}

/** The legacy key a secret is read from: the chat token falls back to the notifications one (as chatEnv). */
function secretKey(input: PlanInput, role: WaLine, name: NumberSecretName): IntegrationKey {
  const own = ROLE_KEYS[role][name];
  if (role !== 'chat' || name !== 'access_token' || sourceOf(input, own) !== 'unset') return own;
  return ROLE_KEYS.notifications.access_token;
}

function fieldView(input: PlanInput, role: WaLine, field: ImportField): ImportFieldView {
  const secret = NUMBER_SECRET_NAMES.some((n) => n === field);
  const key = secret ? secretKey(input, role, field as NumberSecretName) : ROLE_KEYS[role][field];
  const raw = input.legacy[key];
  const value = field === 'provider' ? lineProvider(input.legacy, role) : !secret && typeof raw === 'string' ? raw : null;
  return { field, secret, source: sourceOf(input, key), value };
}

export function planRole(input: PlanInput, role: WaLine): RolePlan {
  const fields = IMPORT_FIELDS.map((f) => fieldView(input, role, f));
  const phone = lineNumbers(input.legacy)[role];
  if (!phone) return { role, action: 'unconfigured', number_id: null, fields, secrets_to_copy: [], copies: [], row: null };
  const existing = input.rows.find((r) => r.phone_number_id === phone) ?? null;
  const have = existing ? (input.status.get(existing.id) ?? {}) : {};
  const copies = NUMBER_SECRET_NAMES.flatMap((name) => {
    const key = secretKey(input, role, name);
    const source = sourceOf(input, key);
    return source === 'unset' || have[name] !== undefined ? [] : [{ name, key, source }];
  });
  const value = (f: ImportField) => fields.find((x) => x.field === f)?.value ?? null;
  const row = { provider: lineProvider(input.legacy, role), phone_number_id: phone, waba_id: value('waba_id'), app_id: value('app_id') };
  return {
    role,
    action: existing ? 'exists' : 'create',
    number_id: existing?.id ?? null,
    fields,
    secrets_to_copy: copies.map((c) => c.name),
    copies,
    row,
  };
}

export const planAll = (input: PlanInput): RolePlan[] => WA_LINES.map((role) => planRole(input, role));
