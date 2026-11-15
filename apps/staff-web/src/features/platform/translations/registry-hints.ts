import { isOwnedSettingKey, SEED_ENTRIES, type Locale } from '@ab/shared';

// The registry hint keys (docs/26 §3): their Arabic text is a value's description, edited on «القيم»
// (the API refuses an ar override there: 409 edit_on_values). English stays editable on «الترجمات».
// Owned keys (send gate, comms_source, Google) are not refused: their ar hints stay editable here.

export interface RegistryHint {
  /** The settings key whose description this hint is. */
  settingKey: string;
  /** Its «القيم» group, when it has one. */
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

/** Is this locale's text of `key` edited on «القيم» rather than here? (ar of a registry hint key). */
export const editedOnValues = (key: string, locale: Locale): boolean => locale === 'ar' && HINTS.has(key);

/** «القيم» on the value's group, searched by its key (the row is the one result). */
export function valuesHref(hint: RegistryHint): string {
  const qs = new URLSearchParams();
  if (hint.group) qs.set('group', hint.group);
  qs.set('q', hint.settingKey);
  return `/admin/settings/values?${qs}`;
}
