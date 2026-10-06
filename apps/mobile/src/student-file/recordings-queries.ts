import type { StudentRecordingView, StudentRecordingsPage } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch, toQueryString } from '@/lib/api';
import { flattenPages, nextPageParam } from '@/lib/paging';
import { listKey } from '@/lib/query-keys';

const PAGE_SIZE = 10;

/** The key prefix of one student's recordings, for invalidation after a visibility change or delete. */
export const recordingsKey = (studentId: string) => ['students', studentId, 'recordings'];

// The rows carry 1-hour signed URLs: `noPersist` keeps them off the disk cache (lib/query-client),
// a restart would show dead links. Playing refetches anyway (openRecording).
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
  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  };
  return { ...query, items, total: pages?.[0]?.total ?? 0, loadMore, refresh: () => void query.refetch() };
}

type Refetch = () => Promise<{ data?: { pages: StudentRecordingsPage[] } | undefined }>;

/**
 * A fresh signed URL for one recording: the link expires, so a tap reloads the loaded pages and
 * reads the URL off the new answer. null when the recording is gone or no longer has a file.
 */
export async function freshRecordingUrl(refetch: Refetch, id: string): Promise<string | null> {
  const result = await refetch();
  const rows: StudentRecordingView[] = flattenPages(result.data?.pages ?? []);
  return rows.find((r) => r.id === id)?.url ?? null;
}
