import { SEED_ENTRIES, type SeedEntry } from './seed-entries.js';

/** One element of config_seed(entries jsonb, …): the table's metadata columns only, never a value. */
export interface ConfigSeedRow {
  key: string;
  module: string;
  scope: SeedEntry['scope'];
  value_type: SeedEntry['value_type'];
  default_value: SeedEntry['default_value'];
  is_public: boolean;
  description_seed: string | null;
  retired: boolean;
}

/** The Arabic text of an ar.json path (null when missing). The caller passes its bundle reader. */
export type HintText = (hintKey: string) => string | null;

/**
 * SEED_ENTRIES → the config_seed payload (docs/26 §2b, §3): `description_seed` is the Arabic hint of the
 * entry (its `hintKey` in ar.json, the canonical MSA text), or null without one. The code-side fields
 * (group, ownedBy, confirm …) stay in code. Used by the API boot seeder, migrate:apply and e2e.
 */
export function seedPayload(hint: HintText, entries: readonly SeedEntry[] = SEED_ENTRIES): ConfigSeedRow[] {
  return entries.map((e) => ({
    key: e.key,
    module: e.module,
    scope: e.scope,
    value_type: e.value_type,
    default_value: e.default_value,
    is_public: e.is_public,
    description_seed: e.hintKey ? clip(hint(e.hintKey)) : null,
    retired: e.retired,
  }));
}

/** A HintText over a nested string bundle (ar.json): the leaf at the dotted path, or null. */
export const bundleText =
  (bundle: object): HintText =>
  (path) => {
    const hit = path.split('.').reduce<unknown>(
      (node, part) => (node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      bundle,
    );
    return typeof hit === 'string' ? hit : null;
  };

const clip = (text: string | null): string | null => {
  const t = text?.trim();
  return t ? t : null;
};
