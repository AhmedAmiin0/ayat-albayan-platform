import type { MessageView, ThreadDetail } from '@ab/shared';
import type { InfiniteData } from '@tanstack/react-query';
import { pathKey } from '@/core/lib/query/query-keys';

// One WhatsApp thread (docs/12 H2): paths, query key and the cache edits an optimistic send makes.
// The cache is an infinite query: pages[0] is the newest page, each next page is older.

export type ThreadCache = InfiniteData<ThreadDetail>;

/** App route of a thread. The + travels encoded (%2B); useLocalSearchParams decodes it. */
export const threadHref = (phone: string) => `/inbox/thread/${encodeURIComponent(phone)}`;
/** API path of a thread (GET /threads/:phone, POST …/text, POST …/template). */
export const threadPath = (phone: string) => `/threads/${encodeURIComponent(phone)}`;
/** ['threads', phone]: a push for this phone refreshes exactly this thread. */
export const threadKey = (phone: string) => pathKey(`/threads/${phone}`);

/** The mutation key of a chat's text / template send. */
export const sendKey = (phone: string) => ['inbox-send', phone];

/**
 * Oldest → newest across the loaded pages; a row a refetch already brought in shows once, as the
 * NEWEST page holding it has it (docs/44 BUG10): mergeNewest refreshes pages[0] only, so an older
 * page's copy of a row at the page boundary can be stale (an old tick).
 */
export function threadMessages(data: ThreadCache | undefined): MessageView[] {
  const rows = [...(data?.pages ?? [])].reverse().flatMap((p) => p.messages);
  // A Map keeps a key where it was first set (its oldest place) and the value set last (newest
  // page).
  return [...new Map(rows.map((m) => [m.id, m])).values()];
}

// The cache edits themselves are shared with web (client-core thread-pages): an optimistic send's
// row, the API's row in its place, a rollback, a fresh newest page folded in (mergeNewest).
export {
  appendMessage,
  leavesGap,
  mergeNewest,
  provisionalMessage,
  removeMessage,
  replaceMessage,
} from '@ab/client-core';
