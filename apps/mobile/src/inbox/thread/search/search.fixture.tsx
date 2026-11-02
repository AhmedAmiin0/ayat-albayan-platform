import type { MessageView } from '@ab/shared';
import { ChatHeader } from '@/inbox/thread/components/ChatHeader';
import { ChatActionsProvider } from '@/inbox/thread/components/ChatActionsProvider';
import { ChatNotice } from '@/inbox/thread/components/ChatNotice';
import { MessageList } from '@/inbox/messages/components/MessageList';
import { cachedThread, detail, message, PHONE, thread } from '@/inbox/shared/thread-fixtures';
import type { useThread } from '@/inbox/thread/hooks/use-thread';
import { ChatSearchButton } from './ChatSearchButton';

// The chat search tests' chat (test-only): the header with «بحث», the list, the notice.

type ThreadQuery = ReturnType<typeof useThread>;
export const id = (n: number) => `b0000000-0000-4000-8000-00000000000${n}`;
export const NEW = message({ id: id(2), body: 'درس الإسلام اليوم', created_at: '2026-10-01T10:00:00Z' });
export const MID = message({ id: id(3), body: 'شكرًا', created_at: '2026-10-01T11:00:00Z' });
export const OLD = message({ id: id(1), body: 'بداية الاسلام', created_at: '2026-09-01T10:00:00Z' });
const hit = (m: MessageView) => ({ id: m.id, created_at: m.created_at, snippet: m.body ?? '' });

/** The API's search page for `found` (newest first). */
export const found = (list: MessageView[]) => ({
  items: list.map(hit),
  total: list.length,
  next_cursor: null,
});

export function stub(pages: MessageView[][], fetchNextPage: jest.Mock, hasNextPage = true) {
  const data = cachedThread(...pages.map((m) => detail(m)));
  const q = { data, hasNextPage, isFetchingNextPage: false, refetch: jest.fn(), fetchNextPage };
  return q as unknown as ThreadQuery;
}

export const page = (pages: MessageView[][], hasNextPage: boolean) => ({
  data: cachedThread(...pages.map((m) => detail(m))),
  hasNextPage,
});

export const chat = (query: ThreadQuery) => (
  <ChatActionsProvider phone={PHONE} thread={thread}>
    <ChatHeader title="أم سهيلة" onBack={jest.fn()} trailing={<ChatSearchButton />} />
    <MessageList phone={PHONE} query={query} />
    <ChatNotice />
  </ChatActionsProvider>
);
