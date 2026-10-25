import type { ConfigEntriesResponse, ConfigEntry, ConfigEntryPatchInput, ConfigEntryResult } from '@ab/shared';
import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '../http/api';
import { CONFIG_QUERY_KEYS } from './query-keys';

/** GET /config/entries (settings.read): every key with value, version, description and owner. */
export const configEntriesQuery = queryOptions({
  queryKey: CONFIG_QUERY_KEYS.entries,
  queryFn: () => apiFetch<ConfigEntriesResponse>('/config/entries'),
});

const keyPath = (key: string) => `/config/entries/${encodeURIComponent(key)}`;

/** PATCH /config/entries/:key with the row's version (409 conflict / owned_by_module, 422, 428, 404). */
export const patchConfigEntry = (key: string, body: ConfigEntryPatchInput) =>
  apiSend<ConfigEntryResult>('PATCH', keyPath(key), body);

/** PUT /config/entries/:key/description; `text: null` restores the seeded text. */
export const putConfigDescription = (key: string, text: string | null) =>
  apiSend<ConfigEntryResult>('PUT', `${keyPath(key)}/description`, { text });

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
