import { SETTING_FIELD_OF, type SettingKey } from '@ab/shared';
import { ApiError } from '@/lib/api';

// PATCH /settings answers today with the whole AcademySettings; from docs/26 26-P0 it answers
// `{saved, moved}` (per key; a key a module owns is `moved`, never written). Both are read here.

export interface SaveOutcome {
  saved: string[];
  moved: string[];
}

const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');

/** Is this the per-key answer `{saved, moved}`? */
export function isSaveOutcome(res: unknown): res is SaveOutcome {
  if (res === null || typeof res !== 'object') return false;
  const r = res as Record<string, unknown>;
  return strings(r.saved) && strings(r.moved);
}

/** Did the API refuse this key as owned by a module page (by row key or camelCase field)? */
export function wasMoved(res: unknown, key: SettingKey): boolean {
  return isSaveOutcome(res) && (res.moved.includes(key) || res.moved.includes(SETTING_FIELD_OF[key]));
}

/**
 * Did the API refuse this key's value (`invalid`, snake_case, from 26-P0; it never 400s per field)?
 * Read from the whole answer (`AcademySettings & {saved, moved, invalid}`), by row key or field.
 */
export function wasInvalid(res: unknown, key: SettingKey): boolean {
  if (res === null || typeof res !== 'object') return false;
  const invalid = (res as Record<string, unknown>).invalid;
  return strings(invalid) && (invalid.includes(key) || invalid.includes(SETTING_FIELD_OF[key]));
}

/** The server's own words for a refused save, when it sent any (`{message}` from Nest). */
export function serverMessage(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.body === null || typeof error.body !== 'object') return undefined;
  const message = (error.body as Record<string, unknown>).message;
  if (typeof message === 'string' && message.trim() !== '') return message;
  if (strings(message) && message.length > 0) return message.join('، ');
  return undefined;
}
