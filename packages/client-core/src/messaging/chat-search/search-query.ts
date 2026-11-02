import type { ChatSearchHit, ChatSearchPage } from '@ab/shared';
import {
  chatSearchKey,
  chatSearchPath,
  parseChatSearchPage,
  type ChatSearchState,
  type SearchStep,
} from './chat-search.js';

/** The app's GET (its apiFetch, untyped: the answer is parsed here). */
export type SearchGet = (path: string) => Promise<unknown>;

/** useInfiniteQuery's options for the search (plain: client-core has no react-query). */
export interface ChatSearchPagesOptions {
  queryKey: ReturnType<typeof chatSearchKey>;
  queryFn: (ctx: { pageParam: string | undefined }) => Promise<ChatSearchPage>;
  initialPageParam: string | undefined;
  getNextPageParam: (last: ChatSearchPage) => string | undefined;
  enabled: boolean;
  staleTime: number;
}

/**
 * The search's infinite-query options for either app (useInfiniteQuery): newest hit first, a
 * page per cursor; nothing asked for a blank search.
 */
export function chatSearchPages(
  phone: string,
  q: string,
  get: SearchGet,
): ChatSearchPagesOptions {
  return {
    queryKey: chatSearchKey(phone, q),
    queryFn: async ({ pageParam }) =>
      parseChatSearchPage(await get(chatSearchPath(phone, q, pageParam))),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: q !== '',
    staleTime: 30_000,
  };
}

/** What both apps' «بحث» provider hands its bar, header and bubbles. */
export interface ChatSearchControls {
  state: ChatSearchState;
  /** The settled words: the bubbles mark them; '' while closed or not asked yet. */
  q: string;
  hits: readonly ChatSearchHit[];
  total: number;
  /** The first page is on its way (the bar says so instead of «لا توجد نتائج»). */
  searching: boolean;
  failed: boolean;
  open: () => void;
  close: () => void;
  type: (text: string) => void;
  step: (dir: SearchStep) => void;
}
