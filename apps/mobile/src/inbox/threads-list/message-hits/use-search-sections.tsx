import type { TreeBase } from '@/core/nav/tree-base';
import type { ThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { MessageHits } from './MessageHits';
import { hasSearchHead, SearchHead } from './SearchHead';
import { useMessageHits } from './use-message-hits';

interface SectionsInput {
  q: string;
  mode: ThreadMode;
  base: TreeBase;
  /** The list's one clock (useToday). */
  now: Date;
  /** Chats the list shows for the words. */
  chats: number;
}

/**
 * The chats list's search sections (docs/37): the head (hint or «المحادثات») above the chats,
 * «الرسائل» under them, and whether any message hit shows (the «no chats» line then stays away).
 */
export function useSearchSections({ q, mode, base, now, chats }: SectionsInput) {
  const found = useMessageHits(q);
  const hits = found.hits.length > 0;
  const head = { q, asked: found.asked, both: hits && chats > 0 };
  return {
    found: hits,
    /** Null when the head shows nothing: no header, so no header gap over the chats. */
    header: hasSearchHead(head) ? <SearchHead {...head} /> : null,
    footer: <MessageHits q={q} found={found} mode={mode} base={base} now={now} />,
  };
}
