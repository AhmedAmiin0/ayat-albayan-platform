import type { Locale } from '@ab/core';
import { isOwnedSettingKey, SEED_ENTRIES } from '@ab/settings';

// Arabic registry hints are edited on the values page (409 edit_on_values, docs/26 §3).

export interface RegistryHint {
  /** The settings key whose description this hint is. */
  settingKey: string;
  group: string | null;
}

const HINTS: ReadonlyMap<string, RegistryHint> = new Map(
  SEED_ENTRIES.filter((e) => e.hintKey !== null && !isOwnedSettingKey(e.key)).map((e) => [
    e.hintKey ?? '',
    { settingKey: e.key, group: e.group },
  ]),
);

/** The value whose description this i18n key is, if it is a registry hint key. */
export const registryHintOf = (key: string): RegistryHint | undefined => HINTS.get(key);

/** True for the Arabic text of a registry hint key, which is edited on the values page. */
export const editedOnValues = (key: string, locale: Locale): boolean => locale === 'ar' && HINTS.has(key);

/** The values page on the value's group, searched by its key so the row is the one result. */
export function valuesHref(hint: RegistryHint): string {
  const qs = new URLSearchParams();
  if (hint.group) qs.set('group', hint.group);
  qs.set('q', hint.settingKey);
  return `/admin/settings/values?${qs}`;
}
