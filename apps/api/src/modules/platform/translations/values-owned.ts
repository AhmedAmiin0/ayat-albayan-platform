import { isOwnedSettingKey, SEED_ENTRIES } from '@ab/settings';
import { ConflictException } from '@nestjs/common';

/** docs/26 §3: ar hints of settings rows are edited on values only; module-owned keys excluded. */
export const VALUES_HINT_KEYS: ReadonlyMap<string, string> = (() => {
  const out = new Map<string, string>();
  for (const e of SEED_ENTRIES) if (e.hintKey && !isOwnedSettingKey(e.key) && !out.has(e.hintKey)) out.set(e.hintKey, e.key);
  return out;
})();

/** 409 `{code: 'edit_on_values', settingKey}` for an ar edit of a settings hint key. */
export function assertNotValuesOwned(locale: string, key: string): void {
  const settingKey = locale === 'ar' ? VALUES_HINT_KEYS.get(key) : undefined;
  if (settingKey !== undefined) {
    throw new ConflictException({ code: 'edit_on_values', message: 'edit_on_values', settingKey });
  }
}
