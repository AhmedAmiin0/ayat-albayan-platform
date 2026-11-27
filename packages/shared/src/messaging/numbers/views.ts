import type { IntegrationSource, NumberPurpose, WaLine, WaProvider } from '@ab/catalog';
import type { NumberEvolutionView } from './evolution';

// Numbers (docs/23 §3): no view ever carries a token or secret value, only set or not with a date.

export { NUMBER_SECRET_NAMES, type NumberSecretName } from './secret-names';
import type { NumberSecretName } from './secret-names';

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
  /**
   * The preset role (default traffic) this number serves; `calls` = WhatsApp calls only, never a
   * message.
   */
  purpose: NumberPurpose;
  provider: WaProvider;
  phone_number_id: string;
  waba_id: string | null;
  app_id: string | null;
  display_phone_e164: string | null;
  enabled: boolean;
  is_default: boolean;
  /** Fallback order inside its role when the chosen number is off (lower first; phase 5). */
  fallback_rank: number;
  health: NumberHealth | null;
  checked_at: string | null;
  updated_at: string;
  secrets: Record<NumberSecretName, NumberSecretState>;
  /** An Evolution number's engine, switch and last state; null on any other provider. */
  evolution: NumberEvolutionView | null;
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

/**
 * GET /admin/numbers/own-traffic: inbound rows FROM one of the academy's own numbers
 * in the last 7 days (an old system still sending to us). Kept for audit, hidden from every list.
 */
export interface OwnTrafficView {
  inbound_7d: number;
}
