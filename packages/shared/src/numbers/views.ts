import type { WaLine } from '../enums/messaging.js';
import type { IntegrationSource } from '../integrations/views.js';
import type { WaProvider } from '../integrations/keys.js';
import type { CommsSource } from '../settings/domains/messaging.js';

// «الأرقام» (docs/23 §3 phase 3): a WhatsApp number as a record. Ids and labels only: no view here ever
// carries a token or secret value (secrets are «set / not set» with a date).

export const NUMBER_SECRET_NAMES = ['access_token', 'app_secret'] as const;
export type NumberSecretName = (typeof NUMBER_SECRET_NAMES)[number];

/** The last line check of the number's phone_number_id (never a token). */
export interface NumberHealth {
  /** The phone call answered (display number known). */
  ok: boolean;
  status: string | null;
  quality_rating: string | null;
  verified_name: string | null;
  /** Key NAMES the line still lacked when checked. */
  gaps: string[];
  errors: number;
}

export interface NumberSecretState {
  set: boolean;
  updated_at: string | null;
}

/** GET /admin/numbers item. */
export interface NumberView {
  id: string;
  label: string;
  /** The preset role (default traffic) this number serves. */
  purpose: WaLine;
  provider: WaProvider;
  phone_number_id: string;
  waba_id: string | null;
  app_id: string | null;
  display_phone_e164: string | null;
  enabled: boolean;
  is_default: boolean;
  health: NumberHealth | null;
  checked_at: string | null;
  updated_at: string;
  secrets: Record<NumberSecretName, NumberSecretState>;
}

/** The import's fields: plain ids show their value, secrets never do. */
export const IMPORT_FIELDS = ['provider', 'phone_number_id', 'waba_id', 'app_id', 'access_token', 'app_secret'] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export interface ImportFieldView {
  field: ImportField;
  secret: boolean;
  source: IntegrationSource;
  /** Plain fields only; ALWAYS null for a secret. */
  value: string | null;
}

/** create = a row will be (was) added; exists = a row with this phone id is there; unconfigured = no phone id today. */
export type ImportAction = 'create' | 'exists' | 'unconfigured';

/** Why a role's row cannot be created: an id fails the wa_numbers checks (META_ID_RE); field NAMES only. */
export interface ImportBlock {
  reason: 'invalid_id';
  fields: ImportField[];
}

export interface ImportRoleView {
  role: WaLine;
  action: ImportAction;
  number_id: string | null;
  fields: ImportFieldView[];
  /** The number's secrets the apply copies (empty = nothing left to copy). */
  secrets_to_copy: NumberSecretName[];
  /** Set = this role is not importable (the apply skips it; the other role still imports). Absent = importable. */
  not_importable?: ImportBlock;
}

/** POST /admin/numbers/import. changed = false on a second apply (a no-op diff). */
export interface ImportResult {
  dry_run: boolean;
  changed: boolean;
  roles: ImportRoleView[];
}

export const PARITY_FIELDS = [
  'configured', 'provider', 'phone_number_id', 'waba_id', 'app_id', 'api_base', 'api_version',
  'access_token', 'app_secret', 'webhook_phone_number_id',
] as const;
export type ParityField = (typeof PARITY_FIELDS)[number];
export const SECRET_PARITY_FIELDS: readonly ParityField[] = ['access_token', 'app_secret'];

/** missing = only one side has a value. */
export type ParityState = 'same' | 'different' | 'missing';

export interface ParityCell {
  field: ParityField;
  state: ParityState;
  /** Plain fields: the value; secrets: 'set' or null (never the value). */
  legacy: string | null;
  module: string | null;
}

export interface ParityRoleView {
  role: WaLine;
  /** The role's default enabled number in module mode, if any. */
  number_id: string | null;
  number_label: string | null;
  fields: ParityCell[];
}

/** GET /admin/communications/parity. The switch to module is refused while `differences` is non-empty. */
export interface ParityView {
  source: CommsSource;
  roles: ParityRoleView[];
  differences: { role: WaLine; field: ParityField; state: Exclude<ParityState, 'same'> }[];
}

/** POST /admin/communications/source → the source now in use. */
export interface CommsSourceView {
  source: CommsSource;
}
