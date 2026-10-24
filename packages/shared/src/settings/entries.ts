import { z } from 'zod';
import type { SettingConfirm, SettingGroup } from './groups.js';
import type { SettingOwner } from './ownership.js';
import type { SettingDef } from './defs.js';

/** A stored description is at most this many characters (the settings_description_len check). */
export const DESCRIPTION_MAX = 500;

/**
 * One row of GET /config/entries (docs/26 §2f): the stored row merged with its code entry. `value` is the
 * effective value (JSON null and a missing row read as the default); `stored` says whether a non-null value
 * is stored. `version` is 0 for a missing row (config_set accepts 0 for an absent row).
 */
export interface ConfigEntry {
  key: string;
  module: string;
  group: SettingGroup | null;
  type: SettingDef['type'];
  /** min / max / options / maxLength … of the code entry (bounds stay in code, §2d). */
  bounds: Record<string, unknown>;
  value: unknown;
  defaultValue: unknown;
  stored: boolean;
  /** The admin's Arabic description (null = none; then the seeded text is shown). */
  description: string | null;
  /** The seeded Arabic text: the registry hint in ar.json at the last boot. */
  descriptionSeed: string | null;
  descriptionEdited: boolean;
  hintKey: string | null;
  labelKey: string;
  public: boolean;
  version: number;
  updatedAt: string | null;
  updatedByName: string | null;
  /** Set when a module page edits the value; «القيم» shows it read-only. */
  ownedBy: SettingOwner | null;
  confirm: SettingConfirm | null;
  retired: boolean;
}

export interface ConfigEntriesResponse {
  entries: ConfigEntry[];
}

/** PATCH /config/entries/:key. `value: null` stores JSON null (= the default), never a delete. */
export const configEntryPatchSchema = z.object({
  value: z.unknown(),
  expectedVersion: z.number().int().min(0),
  confirmText: z.string().max(100).optional(),
});
export type ConfigEntryPatchInput = z.infer<typeof configEntryPatchSchema>;

/** PUT /config/entries/:key/description. null = restore the seeded text (clears the override too). */
export const configDescriptionSchema = z.object({
  text: z.string().trim().min(1).max(DESCRIPTION_MAX).nullable(),
});
export type ConfigDescriptionInput = z.infer<typeof configDescriptionSchema>;

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

/** The answer of PATCH /config/entries/:key and PUT …/description: the row after the write. */
export interface ConfigEntryResult {
  entry: ConfigEntry;
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
export function needsTypedConfirm(confirm: SettingConfirm | null, value: unknown, prev: unknown): boolean {
  if (confirm !== 'typed' || typeof value !== 'number') return false;
  return !(typeof prev === 'number' && value >= prev);
}

/** The typed confirmation matches: the number of days, trimmed (Arabic-Indic digits accepted). */
export function typedConfirmMatches(value: unknown, text: string | undefined): boolean {
  if (typeof text !== 'string') return false;
  const ascii = text.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  return ascii === String(value);
}
