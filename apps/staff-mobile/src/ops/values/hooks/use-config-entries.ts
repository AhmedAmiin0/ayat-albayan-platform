import { configEntryCalls } from '@ab/client-core';
import type { ConfigEntry, SettingKey } from '@ab/settings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, t, refreshOverrides, locale, pathKey } from '@ab/mobile-kit';

const ENTRIES = '/config/entries';
const calls = configEntryCalls({ apiFetch, apiSend });

/** docs/26 §2f: no retry since an older API lacks the route; the sheet then hides editing. */
function useConfigEntries() {
  return useQuery({
    queryKey: pathKey(ENTRIES),
    queryFn: calls.list,
    retry: false,
  });
}

/** One key's row of GET /config/entries, or undefined while loading, on failure or when missing. */
export function useConfigEntry(key: SettingKey): ConfigEntry | undefined {
  const entries = useConfigEntries().data?.entries;
  return Array.isArray(entries) ? entries.find((e) => e.key === key) : undefined;
}

interface DescriptionSave {
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
    mutationFn: (save: DescriptionSave) => calls.describe(save),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pathKey(ENTRIES) });
      void refreshOverrides(t, locale).catch(() => undefined);
    },
  });
}
