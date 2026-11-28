import type { ChatSearchHit, ChatSearchPage } from '@ab/shared';
import type { InboxSearchCalls } from '../inbox';
import { chatSearchKey, type ChatSearchState, type SearchStep } from './chat-search';

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
  calls: Pick<InboxSearchCalls, 'chat'>,
): ChatSearchPagesOptions {
  return {
    queryKey: chatSearchKey(phone, q),
    queryFn: ({ pageParam }) => calls.chat({ phone }, { q, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: q !== '',
    staleTime: 30_000,
  };
}

export interface ChatSearchControls {
  state: ChatSearchState;
  /** The settled words: the bubbles mark them; '' while closed or not asked yet. */
  q: string;
  hits: readonly ChatSearchHit[];
  total: number;
  searching: boolean;
  failed: boolean;
  open: () => void;
  close: () => void;
  type: (text: string) => void;
  step: (dir: SearchStep) => void;
}
