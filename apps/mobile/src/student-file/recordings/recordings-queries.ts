import type { StudentRecordingsPage } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch, toQueryString } from '@/core/lib/http/api';
import { usePagedActions, withTracked } from '@/core/lib/query/paged-result';
import { flattenPages, nextPageParam } from '@/core/lib/query/paging';
import { listKey } from '@/core/lib/query/query-keys';

const PAGE_SIZE = 10;

/** The key prefix of one student's recordings, for invalidation after a visibility change or delete. */
export const recordingsKey = (studentId: string) => ['students', studentId, 'recordings'];

// The rows carry 1-hour signed URLs: `noPersist` keeps them off the disk cache (lib/query-client),
// a restart would show dead links. Playing loads a fresh link anyway (freshRecordingUrl).
const meta = { noPersist: true };

/** GET /students/:id/recordings, newest first, paged; `params` are the filters. */
export function useRecordings(studentId: string, params: Record<string, string | undefined>) {
  const path = `/students/${studentId}/recordings`;
  const query = useInfiniteQuery({
    queryKey: listKey(path, params),
    queryFn: ({ pageParam }) =>
      apiFetch<StudentRecordingsPage>(`${path}${toQueryString({ ...params, page: pageParam, pageSize: PAGE_SIZE })}`),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    meta,
  });
  const pages = query.data?.pages;
  const items = useMemo(() => flattenPages(pages ?? []), [pages]);
  const { loadMore, refresh } = usePagedActions(query);
  const loadPage: LoadPage = (page) => apiFetch<StudentRecordingsPage>(`${path}${toQueryString({ ...params, page, pageSize: PAGE_SIZE })}`);
  const freshUrl = (id: string) => freshRecordingUrl(loadPage, pages ?? [], id);
  return withTracked(query, { items, total: pages?.[0]?.total ?? 0, loadMore, refresh, freshUrl });
}

type LoadPage = (page: number) => Promise<StudentRecordingsPage>;

/**
 * A fresh signed URL for one recording: the link expires, so a tap reloads only the page that holds
 * the row (not every loaded page) and reads the URL off that answer. A failed load throws (the Play
 * button shows its error); null when the row moved, is gone or no longer has a file.
 */
export async function freshRecordingUrl(load: LoadPage, pages: readonly StudentRecordingsPage[], id: string): Promise<string | null> {
  const held = pages.find((p) => p.items.some((r) => r.id === id));
  if (!held) return null;
  const fresh = await load(held.page);
  return fresh.items.find((r) => r.id === id)?.url ?? null;
}
