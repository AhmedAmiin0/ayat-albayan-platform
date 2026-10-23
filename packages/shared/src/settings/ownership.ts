import { camelKey } from './camel.js';

/** The module page / route that writes a key owned outside the generic settings write path (docs/26 §2f, §5). */
export type SettingOwner = 'messages_gate' | 'communications' | 'google_sync';

/**
 * Keys owned elsewhere, decided IN CODE (never by a DB column, docs/26 §9 #6). PATCH /settings never
 * writes them: they come back in `moved`. messaging_enabled / auto_messages_enabled / crm_cutover_done
 * → PUT /messages/gate/*; comms_source → POST /admin/communications/source; Google → PUT /admin/google/settings.
 */
export const OWNED_SETTING_KEYS = {
  messaging_enabled: 'messages_gate',
  auto_messages_enabled: 'messages_gate',
  crm_cutover_done: 'messages_gate',
  comms_source: 'communications',
  // GOOGLE_SETTING_KEYS, written out (src/settings may not import src/google; google/seed-defs.test.ts pins them).
  google_sync_enabled: 'google_sync',
  google_sync_mode: 'google_sync',
  google_calendar_window_days: 'google_sync',
} as const satisfies Record<string, SettingOwner>;

export type OwnedSettingKey = keyof typeof OWNED_SETTING_KEYS;

export const isOwnedSettingKey = (key: string): key is OwnedSettingKey => Object.hasOwn(OWNED_SETTING_KEYS, key);

/** A PATCH body field (camelCase, or the snake_case key itself) → the owned key it names, if any. */
export function ownedKeyOfField(field: string): OwnedSettingKey | null {
  if (isOwnedSettingKey(field)) return field;
  const hit = (Object.keys(OWNED_SETTING_KEYS) as OwnedSettingKey[]).find((k) => camelKey(k) === field);
  return hit ?? null;
}
