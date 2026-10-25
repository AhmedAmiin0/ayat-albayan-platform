import { settingDef, type ConfigEntry, type SettingKey } from '@ab/shared';
import { settings } from '../shared/fixtures';
import { meta } from './values-fixtures';

/** One GET /config/entries row for `key` (the seed = the registry hint path's Arabic text). */
export function entryOf(key: SettingKey, patch: Partial<ConfigEntry> = {}): ConfigEntry {
  const def = settingDef(key);
  return {
    key,
    module: 'settings',
    group: null,
    type: def.type,
    bounds: {},
    value: settings[key],
    defaultValue: null,
    stored: true,
    description: null,
    descriptionSeed: 'الوصف المزروع',
    descriptionEdited: false,
    hintKey: def.hintKey ?? null,
    labelKey: def.labelKey,
    public: false,
    version: 3,
    updatedAt: null,
    updatedByName: null,
    ownedBy: null,
    confirm: null,
    retired: false,
    ...patch,
  };
}

export interface EntriesAnswer {
  permissions: string[];
  /** The rows of GET /config/entries, or an Error it fails with (an older API). */
  entries: ConfigEntry[] | Error;
}

/** GET answers for «القيم» with GET /config/entries too. */
export const entriesAnswer =
  ({ permissions, entries }: EntriesAnswer) =>
  (path: string): Promise<unknown> => {
    if (path === '/auth/me') return Promise.resolve({ role: 'admin', permissions });
    if (path === '/config/meta') return Promise.resolve(meta);
    if (path === '/config/entries') return entries instanceof Error ? Promise.reject(entries) : Promise.resolve({ entries });
    return Promise.resolve(settings);
  };
