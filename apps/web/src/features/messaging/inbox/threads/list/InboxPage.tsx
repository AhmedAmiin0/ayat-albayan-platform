import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { Pager } from '@/components/ui/layout/pager';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { paneScroll } from '@/components/ui/layout/rail';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { threadsQuery } from '../../api/api';
import { useInboxLive } from '../../api/live';
import { InboxListHead } from './InboxListHead';
import { activeList } from '../../lists/lib/active-list';
import { chatListsQuery } from '../../lists/lib/api';
import { ChatListsBar } from '../../lists/components/ChatListsBar';
import { useListsAccess } from '../../lists/lib/use-lists-access';
import { parseInboxSearch, type InboxSearch } from '../../shared/search';
import { ThreadList } from './ThreadList';
import { ThreadPane } from '../pane/ThreadPane';
import { CallsLog } from '../../calls/log/CallsLog';
import { CallsTabs } from '../../calls/log/CallsTabs';
import { useCallsEnabled } from '../../calls/state/call-context';

export interface InboxPageProps {
  search: InboxSearch;
  onSearch: (next: InboxSearch) => void;
  /** Extra items in the list column's head row, before «محادثة جديدة» (sales: the running lessons chip). */
  head?: ReactNode;
}

/**
 * /admin/inbox (R-LEAD-02): every WhatsApp conversation, newest first, beside the open thread.
 * /teacher/inbox (teacher mode): the same page over the teacher's own families only (API-scoped).
 * Admin and sales also start a chat by number («محادثة جديدة» → NewThread's first template).
 * Under 900px the list and the thread are separate screens (the thread has «رجوع»).
 * The page title (ONE cartouche and the count) heads the list column, not the page: the nav tab
 * above already names the screen, so the chat keeps that row.
 */
export function InboxPage({ search, onSearch, head }: InboxPageProps) {
  // «القوائم» (docs/22): with inbox.lists outside teacher mode; an unknown list shows «الكل».
  const lists = useListsAccess();
  const all = useQuery({ ...chatListsQuery, enabled: lists });
  // Lists that failed to load leave no chip to go back with: «الكل».
  const list = lists ? activeList(search.list, all.isError ? [] : all.data) : undefined;
  const shown = parseInboxSearch({ ...search, list });
  useInboxLive(); // a realtime connect / drop re-reads the poll interval (docs/12 §15)
  const threads = useQuery(threadsQuery(shown));
  // «المكالمات» (docs/28) replaces the chats list only while calls are on.
  const callsLog = useCallsEnabled() && !!shown.calls;
  const { phone, ...listSearch } = shown;
  const filter = (patch: Record<string, unknown>) =>
    onSearch(parseInboxSearch({ ...shown, ...patch, page: 1 }));

  return (
    /* From 900px the inbox is exactly the frame's height: the browser page never scrolls, the
       list, the log and the side panel each scroll on their own. Phones: one pane, it flows. */
    <div
      data-testid="inbox-layout"
      className="grid flex-auto gap-4 shell:h-0 shell:min-h-[400px] shell:grid-cols-[clamp(300px,30%,400px)_minmax(0,1fr)] shell:grid-rows-[minmax(0,1fr)]"
    >
      <div
        className={cn(
          'min-w-0 transition-opacity duration-[120ms]',
          paneScroll,
          phone && 'max-shell:hidden',
          threads.isPlaceholderData && 'opacity-60',
        )}
        aria-busy={threads.isPlaceholderData || undefined}
      >
        <InboxListHead total={threads.data?.total} head={head} onOpen={(next) => onSearch({ ...shown, phone: next })} />
        <CallsTabs calls={callsLog} onPick={(calls) => filter({ calls: calls || undefined })} />
        {callsLog && <CallsLog />}
        {!callsLog && lists && <ChatListsBar active={list} onPick={(next) => filter({ list: next })} />}
        {!callsLog && threads.isError && <p role="alert">{t.common.error}</p>}
        {!callsLog && threads.isPending && <ListSkeleton rows={6} />}
        {!callsLog && threads.data && (
          <>
            <ThreadList search={shown} threads={threads.data.items} onFilter={filter} total={threads.isPlaceholderData ? undefined : threads.data.total} />
            <Pager
              page={shown.page}
              total={threads.data.total}
              pageSize={threads.data.pageSize}
              onPage={(page) => onSearch({ ...shown, page })}
            />
          </>
        )}
      </div>
      {phone ? (
        <ThreadPane key={phone} phone={phone} listSearch={listSearch} />
      ) : (
        <EmptyState title={t.inbox.pickThread} className="self-start max-shell:hidden">
          {t.inbox.pickThreadHint}
        </EmptyState>
      )}
    </div>
  );
}
