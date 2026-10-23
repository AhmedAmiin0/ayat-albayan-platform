import { GOOGLE_SEED_DEFS, SEED_ENTRIES, SETTINGS_REGISTRY, type SeedEntry, type SettingDef } from '@ab/shared';

/** Every key the store knows (SEED_ENTRIES): the registry ∪ the google-sync rows, each with its code entry. */
export const CONFIG_DEFS: Readonly<Record<string, SettingDef>> = Object.freeze({ ...SETTINGS_REGISTRY, ...GOOGLE_SEED_DEFS });

export const CONFIG_KEYS: readonly string[] = SEED_ENTRIES.map((e) => e.key);

const SEED_BY_KEY: ReadonlyMap<string, SeedEntry> = new Map(SEED_ENTRIES.map((e) => [e.key, e]));

/** The code entry of a store key, or null for a key the code does not know. */
export function configDef(key: string): SettingDef | null {
  return Object.hasOwn(CONFIG_DEFS, key) ? (CONFIG_DEFS[key] ?? null) : null;
}

export function seedEntryOf(key: string): SeedEntry | null {
  return SEED_BY_KEY.get(key) ?? null;
}

/** A default safe to hand out: lists and objects are copied, so no caller mutates the registry. */
export function defaultOf(def: SettingDef): unknown {
  const d: unknown = def.default;
  if (Array.isArray(d)) return [...d];
  return d !== null && typeof d === 'object' ? { ...d } : d;
}
