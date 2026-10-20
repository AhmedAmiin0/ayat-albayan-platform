import type { ChatListRef } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { t } from '@/lib/i18n';
import { inboxBase, useInboxMode } from '../mode';
import type { InboxSearch } from '../search';

export interface ThreadListChipsProps {
  phone: string;
  lists: readonly ChatListRef[] | undefined;
  /** The list's URL state without the open thread. */
  listSearch: InboxSearch;
}

/**
 * The open chat's lists as small quiet chips in the header's chip line (docs/22 §4). A chip shows that
 * list in the chip row, with this chat still open. Nothing when the chat is in no list.
 */
export function ThreadListChips({ phone, lists, listSearch }: ThreadListChipsProps) {
  const mode = useInboxMode();
  if (!lists?.length || mode === 'teacher') return null;
  return (
    <span role="group" aria-label={t.inbox.lists.chatLists} className="inline-flex shrink-0 items-center gap-1">
      {lists.map((l) => (
        <Link
          key={l.id}
          to={inboxBase(mode)}
          search={{ ...listSearch, list: l.id, phone, page: 1 }}
          className="inline-flex min-h-6 items-center rounded-full border border-rule px-2 text-2xs text-ink-2 no-underline hover:bg-sunk"
        >
          {l.name}
        </Link>
      ))}
    </span>
  );
}
