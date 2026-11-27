import { asciiDigits } from '@ab/core';
import type { SettingConfirm } from '../groups';

/** A stored description is at most this many characters (the settings_description_len check). */
export const DESCRIPTION_MAX = 500;

/** Error codes of the entry routes (the body's `code`): 409, 409, 422, 428, 404. */
export const CONFIG_ENTRY_ERRORS = [
  'conflict', 'owned_by_module', 'invalid', 'confirmation_required', 'unknown_key',
] as const;
export type ConfigEntryError = (typeof CONFIG_ENTRY_ERRORS)[number];

/** 409 `conflict`: someone saved first. The row keeps the admin's draft; these are the newer facts. */
export interface ConfigEntryConflict {
  code: 'conflict';
  key: string;
  current: unknown;
  version: number;
  updatedAt: string | null;
  updatedByName: string | null;
}

/** One key whose legacy effective value (readSettings over the rows) differs from ConfigStore's. */
export interface ConfigParityDiff {
  key: string;
  legacy: unknown;
  store: unknown;
}

/** GET /admin/config/parity: empty `diffs` = both read paths agree (docs/26 §4 «Parity»). */
export interface ConfigParityResponse {
  diffs: ConfigParityDiff[];
  checkedKeys: number;
}

/**
 * Does saving `value` over `prev` need the typed text (VALUE_CONFIRM 'typed' keys delete data)? Only when the
 * deleting starts (from OFF = null) or gets earlier (a shorter period); the server then wants the number of
 * days typed. Lengthening or turning it off deletes nothing more.
 */
export function needsTypedConfirm(
  confirm: SettingConfirm | null,
  value: unknown,
  prev: unknown,
): boolean {
  if (confirm !== 'typed' || typeof value !== 'number') return false;
  return !(typeof prev === 'number' && value >= prev);
}

/**
 * The typed confirmation matches: the number of days, trimmed (Arabic-Indic and Persian digits
 * accepted).
 */
export function typedConfirmMatches(value: unknown, text: string | undefined): boolean {
  if (typeof text !== 'string') return false;
  const ascii = asciiDigits(text.trim());
  return ascii === String(value);
}
