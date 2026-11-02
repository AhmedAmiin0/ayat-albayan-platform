import { chatSearchPageSchema, type ChatSearchHit, type ChatSearchPage } from '@ab/shared';

// «بحث» inside a chat (owner 2026-11-02), shared by web and mobile: the request, the pages and the
// bar's state (open, what is typed, which hit is shown). Hits are newest first: «الأقدم» steps on.

/** How long typing pauses before the search runs. */
export const CHAT_SEARCH_DEBOUNCE_MS = 300;

/** GET /threads/:phone/search: `+` never raw in the path, the words always encoded. */
export function chatSearchPath(phone: string, q: string, cursor?: string): string {
  const params = new URLSearchParams({ q });
  if (cursor) params.set('cursor', cursor);
  return `/threads/${encodeURIComponent(phone)}/search?${params.toString()}`;
}

/** Outside ['threads']: a send's invalidation never reruns the search. */
export const chatSearchKey = (phone: string, q: string) => ['chat-search', phone, q] as const;

/** The API's answer, checked (rule 12). */
export const parseChatSearchPage = (raw: unknown): ChatSearchPage =>
  chatSearchPageSchema.parse(raw);

/** Every loaded hit, newest first, and the chat's total («من M»). */
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

/** Can the bar step that way: «الأقدم» while hits remain, «الأحدث» past the first. */
export const canStep = (index: number, dir: SearchStep, total: number): boolean =>
  stepIndex(index, dir, total) !== index;

/** The shown hit is past the loaded ones: the next page must load first. */
export const needsSearchPage = (index: number, loaded: number): boolean => index >= loaded;

/** «N من M» (1-based); null with no hit. */
export function searchCounter(index: number, total: number): { n: number; m: number } | null {
  return total > 0 ? { n: Math.min(index + 1, total), m: total } : null;
}
