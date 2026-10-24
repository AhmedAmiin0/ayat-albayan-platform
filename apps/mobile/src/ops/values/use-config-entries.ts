import type { ConfigEntriesResponse, ConfigEntry, ConfigEntryResult, SettingKey } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { refreshOverrides } from '@/lib/i18n-overrides';
import { locale } from '@/lib/locale';
import { pathKey } from '@/lib/query-keys';

const ENTRIES = '/config/entries';

/**
 * GET /config/entries (docs/26 §2f): the stored descriptions. No retry: an older API has no such
 * route, and the sheet then shows today's text without «عدّل الوصف» (never an error).
 */
export function useConfigEntries() {
  return useQuery({
    queryKey: pathKey(ENTRIES),
    queryFn: () => apiFetch<ConfigEntriesResponse>(ENTRIES),
    retry: false,
  });
}

/** One key's row of GET /config/entries, or undefined while loading, on failure or when missing. */
export function useConfigEntry(key: SettingKey): ConfigEntry | undefined {
  const entries = useConfigEntries().data?.entries;
  return Array.isArray(entries) ? entries.find((e) => e.key === key) : undefined;
}

export interface DescriptionSave {
  key: SettingKey;
  /** The trimmed text, or null to restore the seeded text. */
  text: string | null;
}

/**
 * PUT /config/entries/:key/description. On success the entries refetch, and the translation
 * overrides too (the API copies the Arabic text into the hint's override, docs/26 §3), so other
 * screens that read the hint through `t` see the edit.
 */
export function useSaveDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, text }: DescriptionSave) =>
      apiSend<ConfigEntryResult>('PUT', `${ENTRIES}/${encodeURIComponent(key)}/description`, { text }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pathKey(ENTRIES) });
      void refreshOverrides(t, locale).catch(() => undefined);
    },
  });
}
