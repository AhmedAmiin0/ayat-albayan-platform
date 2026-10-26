import { applyStrings } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putConfigDescription, storeEntry } from '@/lib/settings/config-entries-api';
import { BUNDLES, t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';
import type { DescribeTarget } from './describe-target';
import { textIn } from './description';

/** «الترجمات» lists the overrides under this prefix (the API writes the ar override with the description). */
export const TRANSLATIONS_QUERY_PREFIX = ['translations'] as const;

/**
 * The API writes the description and the ar override of its hint key in one go (docs/26 §3); `t` got
 * the overrides at boot, so the same text is put into it here and every other place that shows the
 * hint (search, confirmations) reads the new text without a reload. A restore puts the bundled text back.
 */
function mirrorOverride(hintKey: string | null | undefined, text: string | null): void {
  if (locale !== 'ar' || !hintKey) return;
  const next = text ?? textIn(BUNDLES.ar, hintKey);
  if (next !== undefined) applyStrings(t, { [hintKey]: next });
}

/** PUT /config/entries/:key/description (text, or null = «أعد الوصف الأصلي»), then refresh what shows it. */
export function useDescriptionSave(target: DescribeTarget) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (text: string | null) => putConfigDescription(target.key, text),
    onSuccess: async (res, text) => {
      storeEntry(client, res.entry);
      mirrorOverride(res.entry.hintKey ?? target.hintKey, text);
      await Promise.all(
        [CONFIG_QUERY_KEYS.entries, TRANSLATIONS_QUERY_PREFIX, CONFIG_QUERY_KEYS.settingsMeta].map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}
