import { SEED_ENTRIES, type ConfigEntry, type ConfigEntriesResponse } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';

/** One GET /config/entries row for `key` (a seeded key): version 1, no description of its own. Tests only. */
export function entryOf(key: string, over: Partial<ConfigEntry> = {}): ConfigEntry {
  const seed = SEED_ENTRIES.find((e) => e.key === key);
  if (!seed) throw new Error(`not seeded: ${key}`);
  return {
    key,
    module: seed.module,
    group: seed.group,
    type: seed.value_type,
    bounds: {},
    value: seed.default_value,
    defaultValue: seed.default_value,
    stored: false,
    description: null,
    descriptionSeed: null,
    descriptionEdited: false,
    hintKey: seed.hintKey,
    labelKey: key,
    public: seed.is_public,
    version: 1,
    updatedAt: null,
    updatedByName: null,
    ownedBy: seed.ownedBy,
    confirm: seed.confirm,
    retired: seed.retired,
    ...over,
  };
}

/** Every seeded key, with these rows replaced (by key). */
export function entriesFixture(over: readonly ConfigEntry[] = []): ConfigEntriesResponse {
  return { entries: SEED_ENTRIES.map((e) => over.find((o) => o.key === e.key) ?? entryOf(e.key)) };
}

/** An apiSend mock body for PATCH /config/entries/:key: the row back with the next version. */
export async function answerPatch(_method: string, path: string, body?: unknown): Promise<{ entry: ConfigEntry }> {
  const key = decodeURIComponent(path.split('/')[3] ?? '');
  const b = (body ?? {}) as { value?: unknown; expectedVersion?: number };
  return { entry: entryOf(key, { value: b.value, stored: true, version: (b.expectedVersion ?? 0) + 1 }) };
}

/** Puts the entries in a test's query client (the hooks read the row's version from it). */
export function seedEntries(client: QueryClient, over: readonly ConfigEntry[] = []): void {
  client.setQueryData(CONFIG_QUERY_KEYS.entries, entriesFixture(over));
}
