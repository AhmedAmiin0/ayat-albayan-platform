import type { MessageView } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from '../../thread/components/ChatActionsProvider';
import { ChatNotice } from '../../thread/components/ChatNotice';
import { MessageList } from './MessageList';
import { cachedThread, detail, inbound, message, PHONE, thread } from '../../shared/thread-fixtures';
import { JUMP_PAGES } from '../../thread/hooks/use-jump';
import type { useThread } from '../../thread/hooks/use-thread';

// A tap on a quote whose original is on a page not loaded yet: older pages load until it is there.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
}));

type ThreadQuery = ReturnType<typeof useThread>;
const ORIGINAL = message({ id: 'm-old', direction: 'inbound', body: 'السؤال الأول', created_at: '2026-09-20T10:00:00Z' });
const MIDDLE = message({ id: 'm-mid', direction: 'inbound', body: 'وسط', created_at: '2026-09-25T10:00:00Z' });
const answer = message({
  id: 'm9',
  body: 'نعم',
  status: 'sent',
  reply_to: { id: ORIGINAL.id, direction: 'inbound', body: ORIGINAL.body, media_mime: null, template_key: null, sender_name: null },
  created_at: '2026-10-02T08:30:00Z',
});

function stub(pages: MessageView[][], fetchNextPage: jest.Mock, hasNextPage = true) {
  return { data: cachedThread(...pages.map((m) => detail(m))), hasNextPage, isFetchingNextPage: false, refetch: jest.fn(), fetchNextPage } as unknown as ThreadQuery;
}
const page = (pages: MessageView[][], hasNextPage: boolean) => ({ data: cachedThread(...pages.map((m) => detail(m))), hasNextPage });
const tree = (query: ThreadQuery) => (
  <ChatActionsProvider phone={PHONE} thread={thread}>
    <MessageList phone={PHONE} query={query} />
    <ChatNotice />
  </ChatActionsProvider>
);

afterEach(() => jest.restoreAllMocks());

test('the original two pages back: both load, then the list goes to it once it renders', async () => {
  const toIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
  const fetchNextPage = jest
    .fn()
    .mockResolvedValueOnce(page([[inbound, answer], [MIDDLE]], true))
    .mockResolvedValueOnce(page([[inbound, answer], [MIDDLE], [ORIGINAL]], false));
  const view = await renderWithQuery(tree(stub([[inbound, answer]], fetchNextPage)));
  await act(async () => undefined);
  await fireEvent.press(screen.getByTestId(`quote-${ORIGINAL.id}`));
  expect(fetchNextPage).toHaveBeenCalledTimes(2);
  expect(fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
  expect(toIndex).not.toHaveBeenCalled();
  await view.rerender(tree(stub([[inbound, answer], [MIDDLE], [ORIGINAL]], fetchNextPage, false)));
  // Newest first: answer, inbound, middle, original.
  expect(toIndex).toHaveBeenCalledWith({ index: 3, animated: true, viewPosition: 0.5 });
  expect(toIndex).toHaveBeenCalledTimes(1);
});

test('no page holds it: the chat says so once the pages run out, and nothing scrolls', async () => {
  const toIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
  const fetchNextPage = jest.fn().mockResolvedValue(page([[inbound, answer], [MIDDLE]], false));
  await renderWithQuery(tree(stub([[inbound, answer]], fetchNextPage)));
  await act(async () => undefined);
  await fireEvent.press(screen.getByTestId(`quote-${ORIGINAL.id}`));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  expect(await screen.findByText(t.inbox.reply.notFound)).toBeTruthy();
  expect(toIndex).not.toHaveBeenCalled();
});

test('it gives up after JUMP_PAGES pages, and when a page fails', async () => {
  const fetchNextPage = jest.fn().mockResolvedValue(page([[inbound, answer], [MIDDLE]], true));
  const view = await renderWithQuery(tree(stub([[inbound, answer]], fetchNextPage)));
  await act(async () => undefined);
  await fireEvent.press(screen.getByTestId(`quote-${ORIGINAL.id}`));
  expect(fetchNextPage).toHaveBeenCalledTimes(JUMP_PAGES);
  expect(await screen.findByText(t.inbox.reply.notFound)).toBeTruthy();
  const failing = jest.fn().mockRejectedValue(new Error('offline'));
  await view.rerender(tree(stub([[inbound, answer]], failing)));
  await fireEvent.press(screen.getByTestId(`quote-${ORIGINAL.id}`));
  expect(failing).toHaveBeenCalledTimes(1);
});
