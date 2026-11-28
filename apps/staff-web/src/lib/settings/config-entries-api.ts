import { configEntryCalls } from '@ab/client-core';
import type { ConfigEntry, ConfigEntryPatchInput } from '@ab/settings';
import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { CONFIG_QUERY_KEYS } from './query-keys';

const calls = configEntryCalls({ apiFetch, apiSend });

/** Every key with value, version, description and owner (settings.read). */
export const configEntriesQuery = queryOptions({
  queryKey: CONFIG_QUERY_KEYS.entries,
  queryFn: calls.list,
});

/** Saves with the row's version (409 conflict / owned_by_module, 422, 428, 404). */
export const patchConfigEntry = (key: string, body: ConfigEntryPatchInput) =>
  calls.patch({ key, body });

/** `text: null` restores the seeded text. */
export const putConfigDescription = (key: string, text: string | null) =>
  calls.describe({ key, text });

/** The cached row of `key`, if the entries were read. */
export function cachedEntry(client: QueryClient, key: string): ConfigEntry | undefined {
  return client.getQueryData(configEntriesQuery.queryKey)?.entries.find((e) => e.key === key);
}

/** Writes a row the API answered with into the cache, so the next save sends its new version. */
export function storeEntry(client: QueryClient, entry: ConfigEntry): void {
  client.setQueryData(configEntriesQuery.queryKey, (old) =>
    old ? { entries: old.entries.map((e) => (e.key === entry.key ? entry : e)) } : old,
  );
}

const NO_ENTRIES: readonly ConfigEntry[] = [];

/** The entries once read (none while loading or after a failed read; the rows then show the code's words). */
export function useConfigEntries(): readonly ConfigEntry[] {
  return useQuery(configEntriesQuery).data?.entries ?? NO_ENTRIES;
}
