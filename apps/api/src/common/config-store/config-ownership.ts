import { isOwnedSettingKey, OWNED_SETTING_KEYS, type SettingOwner } from '@ab/shared';
import { can } from '../auth/permissions';
import type { AuthUser } from '../auth/verify-token';
import { configDef, seedEntryOf } from './config-defs';

// Who owns a key is decided IN CODE (docs/26 §2a, §9 #6): OWNED_SETTING_KEYS and the registry's
// `ownedBy` / `patch: false`, never a DB column.

/** The module that owns `key`, or null for a «القيم» key. */
export function ownerOf(key: string): SettingOwner | null {
  if (isOwnedSettingKey(key)) return OWNED_SETTING_KEYS[key];
  return seedEntryOf(key)?.ownedBy ?? null;
}

/** May PATCH /config/entries write it? Never an owned key or a `patch: false` entry. */
export function isModuleOwned(key: string): boolean {
  return ownerOf(key) !== null || configDef(key)?.patch === false;
}

/** The base-role admin (not only a custom role holding the permission): the academy's Google rows. */
export const isBaseAdmin = (user: AuthUser): boolean => user.role === 'admin';

/**
 * The extra check, beyond settings.write, to edit an owned key's description: the owning module's
 * permission. Exhaustive: a new SettingOwner fails to compile until it is given one.
 */
export const OWNER_MAY_DESCRIBE: Readonly<Record<SettingOwner, (user: AuthUser) => boolean>> = {
  messages_gate: (user) => can(user, 'settings.write'),
  communications: (user) => can(user, 'numbers.manage'),
  google_sync: isBaseAdmin,
};

/** settings.write is checked by the route; this adds the owner's permission for an owned key. */
export function mayDescribe(user: AuthUser, key: string): boolean {
  const owner = ownerOf(key);
  return owner === null || OWNER_MAY_DESCRIBE[owner](user);
}

/** Google rows are listed to base admins only (docs/26 §2f). */
export const mayView = (user: AuthUser, key: string): boolean => ownerOf(key) !== 'google_sync' || isBaseAdmin(user);
