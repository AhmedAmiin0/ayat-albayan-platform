import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { EmptyState, Pager, ListSkeleton, paneScroll, t, cn } from '@ab/web-kit';
import { useThreads } from '@/features/messaging/inbox/api/list-ticks';
import { useInboxLive } from '@/features/messaging/inbox/api/live';
import { InboxListHead } from '@/features/messaging/inbox/threads/list/InboxListHead';
import { activeList } from '@/features/messaging/inbox/lists/lib/active-list';
import { chatListsQuery } from '@/features/messaging/inbox/lists/lib/api';
import { ChatListsBar } from '@/features/messaging/inbox/lists/components/ChatListsBar';
import { useListsAccess } from '@/features/messaging/inbox/lists/lib/use-lists-access';
import { parseInboxSearch, type InboxSearch } from '@/features/messaging/inbox/shared/search';
import { ChatAnchorContext, type ChatAnchor } from '@/features/messaging/inbox/shared/chat-anchor';
import { ThreadList } from '@/features/messaging/inbox/threads/list/ThreadList';
import { ThreadPane } from '@/features/messaging/inbox/threads/pane/ThreadPane';
import { CallsLog } from '@/features/messaging/calls';
import { CallsTabs } from '@/features/messaging/calls';
import { useCallsEnabled } from '@/features/messaging/calls';

export interface InboxPageProps {
  search: InboxSearch;
  /** `replace`: a chat's anchor moves without a history entry (docs/37). */
  onSearch: (next: InboxSearch, how?: { replace: boolean }) => void;
  head?: ReactNode;
}

/** Teacher mode shows only the teacher's own families, scoped by the API (R-LEAD-02). */
export function InboxPage({ search, onSearch, head }: InboxPageProps) {
  // Lists need inbox.lists outside teacher mode; an unknown list shows all (docs/22).
  const lists = useListsAccess();
  const all = useQuery({ ...chatListsQuery, enabled: lists });
  // Lists that failed to load fall back to all chats.
  const list = lists ? activeList(search.list, all.isError ? [] : all.data) : undefined;
  const shown = parseInboxSearch({ ...search, list });
  useInboxLive(); // a realtime connect / drop re-reads the poll interval (docs/12 §15)
  const threads = useThreads(shown); // Calls log (docs/28) replaces chats only while calls are on.
  const callsLog = useCallsEnabled() && !!shown.calls;
  const { phone, msg, ...listSearch } = shown;
  const filter = (patch: Record<string, unknown>) =>
    onSearch(parseInboxSearch({ ...shown, ...patch, page: 1 }));
  const anchor: ChatAnchor = {
    msg,
    anchor: (id) => onSearch({ ...listSearch, phone, msg: id }, { replace: true }),
    open: (to) => onSearch({ ...listSearch, ...to }),
  };

  return (
    /* From 900px the inbox is exactly the frame's height: the browser page never scrolls, the
       list, the log and the side panel each scroll on their own. Phones: one pane, it flows. */
    <ChatAnchorContext value={anchor}>
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
        <InboxListHead total={threads.data?.total} head={head} onOpen={(next) => onSearch({ ...listSearch, phone: next })} />
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
    </ChatAnchorContext>
  );
}
