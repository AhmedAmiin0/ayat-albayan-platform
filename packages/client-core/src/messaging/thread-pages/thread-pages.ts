import type { ThreadDetail } from '@ab/shared';

// A chat's pages (docs/37 NEW 3/4), shared by web and mobile: the compound keyset back
// (before + before_id: rows sharing a time are never skipped) and the anchored window around one
// message (?around=<id>: 20 newer, the hit, older ones to fill the page).

/** A page's start: the newest (null), older than a row, or the window around a message. */
export type ThreadPageParam = { before: string; before_id: string } | { around: string } | null;

/** A param as a cache may hold it: older builds persisted the bare `before` string. */
type AnyParam = ThreadPageParam | string | undefined;

const toParams = (param: Exclude<AnyParam, null | undefined>): Record<string, string> =>
  typeof param === 'string' ? { before: param } : param;

/** The query string of a page ('' for the newest); a legacy string param still pages back. */
export function threadPageQuery(param: AnyParam): string {
  const params = new URLSearchParams(param ? toParams(param) : {});
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

/** The page after `last` (older), keyed by its oldest row; undefined at the chat's start. */
export function threadNextParam(
  last: Pick<ThreadDetail, 'has_more' | 'messages'>,
): ThreadPageParam | undefined {
  const oldest = last.messages[0];
  return last.has_more && oldest ? { before: oldest.created_at, before_id: oldest.id } : undefined;
}

/** The app's typed GET of a chat page (its apiFetch<ThreadDetail>), with TanStack's signal. */
export type ThreadGet = (path: string, init: { signal: AbortSignal }) => Promise<ThreadDetail>;

/** Outside the live chat's keys on purpose: sends, polls and invalidations never write into it. */
export const anchoredThreadKey = (phone: string, id: string) => ['thread-at', phone, id] as const;

/** Every anchored window of a chat (a bubble action refreshes them with the live chat). */
export const anchoredThreadPrefix = (phone: string) => ['thread-at', phone] as const;

/** useInfiniteQuery's options of an anchored window (plain: client-core has no react-query). */
export interface AnchoredPagesOptions {
  queryKey: ReturnType<typeof anchoredThreadKey>;
  queryFn: (ctx: { pageParam: ThreadPageParam; signal: AbortSignal }) => Promise<ThreadDetail>;
  initialPageParam: ThreadPageParam;
  getNextPageParam: (last: ThreadDetail) => ThreadPageParam | undefined;
  staleTime: number;
}

/** The window around message `id`, then older pages inside it; static (no refetch of its own). */
export function anchoredThreadPages(
  phone: string,
  id: string,
  get: ThreadGet,
): AnchoredPagesOptions {
  const path = `/threads/${encodeURIComponent(phone)}`;
  return {
    queryKey: anchoredThreadKey(phone, id),
    // TanStack's signal (docs/43 AU8): leaving the window cancels its read.
    queryFn: ({ pageParam, signal }) => get(`${path}${threadPageQuery(pageParam)}`, { signal }),
    initialPageParam: { around: id },
    getNextPageParam: threadNextParam,
    staleTime: Number.POSITIVE_INFINITY,
  };
}

export type JumpPlan = 'scroll' | 'anchor';

/** A hit already on screen scrolls; any other opens the window around it (one request). */
export const jumpPlan = (id: string, shown: Iterable<string>): JumpPlan =>
  new Set(shown).has(id) ? 'scroll' : 'anchor';

/** The window's newest time: the calls merged into it stop there (null = the live chat). */
export const windowEnd = (messages: readonly { created_at: string }[]): string | null =>
  messages.at(-1)?.created_at ?? null;
