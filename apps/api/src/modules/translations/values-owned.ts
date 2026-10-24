import { isOwnedSettingKey, SEED_ENTRIES } from '@ab/shared';
import { ConflictException } from '@nestjs/common';

/**
 * docs/26 §3: the hint key of a settings row → that row's key. Its Arabic text is the row's description,
 * edited on «القيم» (config_describe writes the ar override in the same transaction), so «الترجمات»
 * refuses the ar override of these keys; en stays editable. The first row naming a hint key wins. Keys a
 * module route owns (send gate, comms_source, Google) are left out, like the one-time copy of migration
 * config_describe: their ar hints stay editable in «الترجمات» by `settings.write` holders.
 */
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
