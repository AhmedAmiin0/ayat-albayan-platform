import type { SettingDef } from './defs.js';
import { GOOGLE_SEED_DEFS } from './google-defs.js';
import { MODULE_GROUPS, type SettingConfirm, type SettingGroup } from './groups.js';
import type { SettingOwner } from './ownership.js';
import { SETTINGS_REGISTRY } from './registry.js';

/**
 * Bump when any SEED_ENTRIES metadata changes (module, group, scope, type, default, public, hint,
 * owner, confirm, retired). The 26-P2 seeder sends it to config_seed, which ignores an older version
 * so a rollback or an older build cannot rewrite the metadata (docs/26 §2a).
 */
export const REGISTRY_VERSION = 1;

/** «القيم» rows (config) vs rows a module page owns and «القيم» only shows (docs/26 §1). */
export type SeedScope = 'config' | 'module';

/**
 * One public.settings row's metadata, as the future config_seed(entries jsonb) takes it (docs/26 §2b).
 * The snake_case fields mirror table columns; the camelCase ones are code-side metadata the API merges
 * into GET /config/entries. There is no value here: the seeder never writes one.
 */
export interface SeedEntry {
  key: string;
  module: string;
  scope: SeedScope;
  value_type: SettingDef['type'];
  default_value: SettingDef['default'];
  is_public: boolean;
  /** The seeded Arabic description (26-P2 fills it; null until then). */
  description_seed: string | null;
  retired: boolean;
  group: SettingGroup | null;
  hintKey: string | null;
  ownedBy: SettingOwner | null;
  confirm: SettingConfirm | null;
  reachesFamilies: boolean;
}

const MODULE_GROUP_SET: ReadonlySet<string> = new Set(MODULE_GROUPS);

/** module when a module page owns it (ownedBy) or it sits in a «تُدار من صفحة أخرى» group. */
export const seedScope = (def: SettingDef): SeedScope =>
  def.ownedBy !== undefined || (def.group !== undefined && MODULE_GROUP_SET.has(def.group)) ? 'module' : 'config';

export function seedEntry(key: string, def: SettingDef): SeedEntry {
  return {
    key,
    module: def.module ?? '',
    scope: seedScope(def),
    value_type: def.type,
    default_value: def.default,
    is_public: def.public === true,
    description_seed: null,
    retired: def.retired === true,
    group: def.group ?? null,
    hintKey: def.hintKey ?? null,
    ownedBy: def.ownedBy ?? null,
    confirm: def.confirm ?? null,
    reachesFamilies: def.reachesFamilies === true,
  };
}

/**
 * Every row the seeder owns: the registry ∪ the google-sync rows (outside the registry) ∪ module keys
 * kept outside the generic write path (comms_source is a registry entry with patch: false, so it is
 * listed once). INERT: nothing calls a seeder yet (26-P2).
 */
const SEED_DEFS: Readonly<Record<string, SettingDef>> = { ...SETTINGS_REGISTRY, ...GOOGLE_SEED_DEFS };

export const SEED_ENTRIES: readonly SeedEntry[] = Object.freeze(
  Object.entries(SEED_DEFS).map(([key, def]) => Object.freeze(seedEntry(key, def))),
);

/** Seed key format (docs/26 §2a check, code keys). */
export const SEED_KEY_RE = /^[a-z][a-z0-9_]{1,63}$/;

/** A key that looks like a secret: secrets live in Vault only (docs/26 §2a). */
export const looksLikeSecretKey = (key: string): boolean => /(_token|_secret|_key)$/.test(key);
