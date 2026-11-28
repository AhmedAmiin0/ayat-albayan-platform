import { applyLiveRows, type LiveRow, patchListPages, replaceListRow } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { threadKeys } from '@/core/lib/keys';
import type { ThreadListCache } from './thread-list-cache';

type ListEdit = (old: ThreadListCache | undefined) => ThreadListCache | undefined;

/**
 * Every cached list edited in place, keeping its read time: an edit is not a read, so it never
 * hides a change a hidden list missed (list-marks.ts compares that time with its mark).
 */
export function editLists(client: QueryClient, edit: ListEdit): void {
  for (const [queryKey] of client.getQueriesData<ThreadListCache>({ queryKey: threadKeys.lists })) {
    const updatedAt = client.getQueryState(queryKey)?.dataUpdatedAt;
    client.setQueryData<ThreadListCache>(queryKey, edit, { updatedAt });
  }
}

/**
 * A send answered: the API's row in place of its provisional one in every cached list, so the
 * ticks keyed on the last message's id (events, the chat, the phone store) reach the row.
 */
export function replaceListRows(
  client: QueryClient,
  provisionalId: string,
  row: MessageView,
): void {
  editLists(client, (old) => replaceListRow(old, provisionalId, row));
}

/** An event's ticks on every cached list at once (docs/44 K1); the re-read still follows. */
export function patchLists(client: QueryClient, rows: readonly LiveRow[]): void {
  const incoming = applyLiveRows(rows);
  editLists(client, (old) => old && patchListPages(old, incoming));
}
