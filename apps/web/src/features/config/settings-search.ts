import { normalizeArabic, settingDef, type SettingKey } from '@ab/shared';
import { settingText, textAt } from '../messaging/setting-text';

const fold = (s: string): string => normalizeArabic(s).toLowerCase();

/** Does the text contain the search (case, diacritics and alef forms ignored)? An empty search matches. */
export function matchesText(text: string, query: string): boolean {
  const q = fold(query.trim());
  return q === '' || fold(text).includes(q);
}

/** A setting matches by its label, hint, switch words or row key. */
export function matchesSetting(key: SettingKey, query: string): boolean {
  const words = settingText(key);
  const def = settingDef(key);
  const extra = [textAt(def.labelKey), words.hint, words.toggle, words.toggleHint].filter(Boolean).join(' ');
  return matchesText(`${extra} ${key}`, query);
}
