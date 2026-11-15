import { matchesQuery, settingDef, type SettingKey } from '@ab/shared';
import { settingText, textAt } from './setting-text';

/** Does the text contain the search (case, diacritics and alef forms ignored)? An empty search matches. */
export function matchesText(text: string, query: string): boolean {
  return matchesQuery(text, query);
}

/** A setting matches by its label, hint, switch words or row key. */
export function matchesSetting(key: SettingKey, query: string): boolean {
  const words = settingText(key);
  const def = settingDef(key);
  const extra = [textAt(def.labelKey), words.hint, words.toggle, words.toggleHint].filter(Boolean).join(' ');
  return matchesText(`${extra} ${key}`, query);
}
