import type { ThreadView } from '@ab/shared';
import { EmptyState } from '@/components/ui/display/empty-state';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import type { InboxSearch } from '@/features/messaging/inbox/shared/search';
import { ThreadRow } from './ThreadRow';
import { emptyTitle } from './empty-title';
import { MessageHits, SearchHead, useMessageHits } from './message-hits';

export interface ThreadResultsProps {
  search: InboxSearch;
  threads: ThreadView[];
}

/**
 * The chats matching the box (name / number) and, from 3 folded characters, «الرسائل» below
 * them (docs/37 NEW 1). «المحادثات» labels the chats only when both sections show; with no
 * chat but message hits, the hits stand alone (no «لا توجد محادثات»).
 */
export function ThreadResults({ search, threads }: ThreadResultsProps) {
  // One ticking clock for every row (not one timer per row): the times turn into dates at midnight.
  const now = useNow();
  // The box is already debounced (ColumnFilterText): its value is the query.
  const hits = useMessageHits(search.q ?? '');
  const chats = threads.length > 0;
  const alone = !chats && !(hits.shown && hits.hits.length > 0);
  return (
    <>
      <SearchHead hits={hits} chats={chats} />
      {alone && <EmptyState title={emptyTitle(search)} />}
      {chats && (
        <ul aria-label={t.inbox.title} className="border-t border-rule">
          {threads.map((th) => (
            <ThreadRow
              key={th.phone_e164}
              thread={th}
              search={search}
              active={th.phone_e164 === search.phone}
              now={now}
            />
          ))}
        </ul>
      )}
      {hits.shown && <MessageHits hits={hits} active={search.msg} />}
    </>
  );
}
