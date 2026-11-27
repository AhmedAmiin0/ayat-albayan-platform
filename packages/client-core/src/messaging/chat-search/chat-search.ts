import type { ChatSearchHit, ChatSearchPage } from '@ab/shared';

// In-chat search for web and mobile; hits are newest first.

/** How long typing pauses before the search runs. */
export const CHAT_SEARCH_DEBOUNCE_MS = 300;

/** Outside ['threads']: a send's invalidation never reruns the search. */
export const chatSearchKey = (phone: string, q: string) => ['chat-search', phone, q] as const;

export function searchHits(pages: readonly ChatSearchPage[] | undefined): {
  hits: ChatSearchHit[];
  total: number;
} {
  return { hits: (pages ?? []).flatMap((p) => p.items), total: pages?.[0]?.total ?? 0 };
}

export type SearchStep = 'older' | 'newer';

export interface ChatSearchState {
  open: boolean;
  text: string;
  /** The shown hit (0 = the newest). */
  index: number;
}

export type ChatSearchAction =
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'type'; text: string }
  | { type: 'step'; dir: SearchStep; total: number };

export const CHAT_SEARCH_CLOSED: ChatSearchState = { open: false, text: '', index: 0 };

const MOVE: Record<SearchStep, number> = { older: 1, newer: -1 };

/** The next hit's index, kept inside 0…total-1 (no wrap, as WhatsApp). */
export const stepIndex = (index: number, dir: SearchStep, total: number): number =>
  Math.min(Math.max(index + MOVE[dir], 0), Math.max(total - 1, 0));

const REDUCE: {
  [K in ChatSearchAction['type']]: (
    s: ChatSearchState,
    a: Extract<ChatSearchAction, { type: K }>,
  ) => ChatSearchState;
} = {
  open: (s) => ({ ...s, open: true }),
  close: () => CHAT_SEARCH_CLOSED,
  type: (s, a) => ({ ...s, text: a.text, index: 0 }),
  step: (s, a) => ({ ...s, index: stepIndex(s.index, a.dir, a.total) }),
};

export function chatSearchReducer(s: ChatSearchState, a: ChatSearchAction): ChatSearchState {
  const reduce = REDUCE[a.type] as (s: ChatSearchState, a: ChatSearchAction) => ChatSearchState;
  return reduce(s, a);
}

export const canStep = (index: number, dir: SearchStep, total: number): boolean =>
  stepIndex(index, dir, total) !== index;

/** The shown hit is past the loaded ones: the next page must load first. */
export const needsSearchPage = (index: number, loaded: number): boolean => index >= loaded;

/** 1-based; null with no hit. */
export function searchCounter(index: number, total: number): { n: number; m: number } | null {
  return total > 0 ? { n: Math.min(index + 1, total), m: total } : null;
}
