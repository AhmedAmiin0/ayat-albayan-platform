import type { SettingKey } from '@ab/shared';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { cachedEntry, configEntriesQuery, patchConfigEntry, storeEntry } from '@/lib/config-entries-api';
import { CONFIG_QUERY_KEYS } from '@/lib/query-keys';
import { IDLE, saveFailure, type RowStatus, type SaveEnd } from './entry-save-result';

export type { RowStatus, SaveEnd };

/** One row's save: the value, the typed confirmation if asked, and the version to send (else the row's). */
export interface SaveInput {
  value: unknown;
  confirmText?: string | undefined;
  /** «احفظ قيمتي» after a conflict: the newer version the 409 named. */
  version?: number | undefined;
}

export interface RowSaves {
  status: (key: SettingKey) => RowStatus;
  /** One PATCH /config/entries/:key with the row's version; rows save independently of each other. */
  run: (key: SettingKey, input: SaveInput) => Promise<SaveEnd>;
  /** Forgets a failed save (the row was edited or put back), so no stale «أعد المحاولة» stays. */
  clearFailed: (key: SettingKey) => void;
  /** Forgets a failed save or a conflict (the edit was dropped). */
  clear: (key: SettingKey) => void;
}

/** The row's version: the cached entry's, else the entries read now (a failed read fails the save). */
async function versionOf(client: QueryClient, key: SettingKey): Promise<number> {
  const hit = cachedEntry(client, key) ?? (await client.fetchQuery(configEntriesQuery)).entries.find((e) => e.key === key);
  if (!hit) throw new Error(`no entry ${key}`);
  return hit.version;
}

/** The settings, «آخر تعديل», the public config and the entries are read again after a write. */
export const refreshValues = (client: QueryClient) =>
  Promise.all(
    [CONFIG_QUERY_KEYS.settings, CONFIG_QUERY_KEYS.settingsMeta, CONFIG_QUERY_KEYS.publicConfig, CONFIG_QUERY_KEYS.entries].map((queryKey) =>
      client.invalidateQueries({ queryKey }),
    ),
  );

/**
 * Each row's own save (docs/26b §2 «One save model»): PATCH /config/entries/:key with the row's
 * `version`. The status lives per key, so saving row A never touches row B, and it outlives a group
 * switch. The answered row goes into the entries cache (the next save, e.g. «تراجع», sends its new
 * version); a 409 conflict keeps the edit and refetches, so the conflict row can show the newer value.
 */
export function useRowSaves(): RowSaves {
  const queryClient = useQueryClient();
  const [statuses, setStatuses] = useState<Partial<Record<SettingKey, RowStatus>>>({});
  const set = useCallback((key: SettingKey, s: RowStatus) => setStatuses((all) => ({ ...all, [key]: s })), []);
  const run = useCallback(
    async (key: SettingKey, input: SaveInput): Promise<SaveEnd> => {
      set(key, { state: 'saving' });
      try {
        const expectedVersion = input.version ?? (await versionOf(queryClient, key));
        const body = { value: input.value, expectedVersion, ...(input.confirmText === undefined ? {} : { confirmText: input.confirmText }) };
        const res = await patchConfigEntry(key, body);
        storeEntry(queryClient, res.entry);
        await refreshValues(queryClient);
        set(key, IDLE);
        return 'saved';
      } catch (error) {
        const out = saveFailure(error, { mine: input.value, typed: input.confirmText !== undefined });
        set(key, out.status);
        if (out.end === 'conflict') void refreshValues(queryClient);
        return out.end;
      }
    },
    [queryClient, set],
  );
  const clearWhen = useCallback(
    (key: SettingKey, states: readonly RowStatus['state'][]) =>
      setStatuses((all) => {
        const s = all[key]?.state;
        return s && states.includes(s) ? { ...all, [key]: IDLE } : all;
      }),
    [],
  );
  const clearFailed = useCallback((key: SettingKey) => clearWhen(key, ['failed']), [clearWhen]);
  const clear = useCallback((key: SettingKey) => clearWhen(key, ['failed', 'conflict']), [clearWhen]);
  return { status: (key) => statuses[key] ?? IDLE, run, clearFailed, clear };
}
