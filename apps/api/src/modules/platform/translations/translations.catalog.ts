import {
  flattenStrings,
  missingPlaceholders,
  sectionOf,
  type FlatStrings,
  type Locale,
  type TranslationKeyRow,
  type TranslationKeysPage,
  type TranslationKeysQuery,
} from '@ab/shared';
import { BUNDLES } from '@/common/infra/i18n/server-text';
import { VALUES_HINT_KEYS } from './values-owned';

// Pure side of the translations editor: the key catalogue from the bundled JSON, the search /
// section / page of GET /i18n/keys, and the checks a PUT must pass.

/** Every string leaf of each bundle (en.json has ar.json's keys: shared i18n-parity test). */
export const DEFAULTS: Readonly<Record<Locale, FlatStrings>> = {
  ar: flattenStrings(BUNDLES.ar),
  en: flattenStrings(BUNDLES.en),
};

const KEYS = Object.keys(DEFAULTS.ar).sort();
const SECTIONS = [...new Set(KEYS.map(sectionOf))].sort();

export type OverrideMaps = Readonly<Record<Locale, FlatStrings>>;

function row(key: string, overrides: OverrideMaps): TranslationKeyRow {
  const valuesKey = VALUES_HINT_KEYS.get(key);
  return {
    ...(valuesKey === undefined ? {} : { valuesKey }),
    key,
    section: sectionOf(key),
    ar: DEFAULTS.ar[key] ?? '',
    en: DEFAULTS.en[key] ?? '',
    arOverride: overrides.ar[key] ?? null,
    enOverride: overrides.en[key] ?? null,
  };
}

function matches(r: TranslationKeyRow, needle: string): boolean {
  return [r.key, r.ar, r.en, r.arOverride ?? '', r.enOverride ?? ''].some((v) => v.toLowerCase().includes(needle));
}

/** GET /i18n/keys: sorted by key, filtered by section and a case-insensitive search, one page. */
export function listKeys(query: TranslationKeysQuery, overrides: OverrideMaps): TranslationKeysPage {
  const needle = query.search?.toLowerCase() ?? '';
  const rows = KEYS.filter((k) => !query.section || sectionOf(k) === query.section)
    .map((k) => row(k, overrides))
    .filter((r) => !needle || matches(r, needle));
  const start = (query.page - 1) * query.pageSize;
  return {
    items: rows.slice(start, start + query.pageSize),
    total: rows.length,
    page: query.page,
    pageSize: query.pageSize,
    sections: SECTIONS,
  };
}

type OverrideProblem = { kind: 'unknown_key' } | { kind: 'placeholders_missing'; missing: string[] };

/** Why `value` cannot override `key` in `locale`, or null: the key must exist, slots must stay. */
export function overrideProblem(locale: Locale, key: string, value: string): OverrideProblem | null {
  if (!Object.hasOwn(DEFAULTS[locale], key)) return { kind: 'unknown_key' };
  const missing = missingPlaceholders(DEFAULTS[locale][key] ?? '', value);
  return missing.length > 0 ? { kind: 'placeholders_missing', missing } : null;
}
