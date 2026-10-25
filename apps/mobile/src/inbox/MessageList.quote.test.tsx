import type { MessageView } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { FlatList, StyleSheet } from 'react-native';
import { t } from '@/lib/i18n';
import { palette } from '@/theme';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from './ChatActionsProvider';
import { ChatNotice } from './ChatNotice';
import { MessageList } from './MessageList';
import { cachedThread, detail, inbound, message, PHONE, thread } from './thread-fixtures';
import { LIT_MS } from './use-jump';
import type { useThread } from './use-thread';

// A bubble that answers another shows its quote on top; a tap goes to the original (owner 2026-10-25).
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
}));

type ThreadQuery = ReturnType<typeof useThread>;
const quoteOf = (m: MessageView, fields: Partial<MessageView['reply_to']> = {}) => ({
  id: m.id,
  direction: m.direction,
  body: m.body,
  media_mime: null,
  template_key: null,
  sender_name: null,
  ...fields,
});
const answer = message({
  id: 'm9',
  body: 'نعم، الحلقة غدًا',
  status: 'sent',
  reply_to_message_id: inbound.id,
  reply_to: quoteOf(inbound),
  created_at: '2026-10-02T08:30:00Z',
});
const older = message({
  id: 'm8',
  body: 'وصلتني الصورة',
  status: 'sent',
  reply_to: quoteOf(inbound, { id: 'gone', body: null, media_mime: 'image/jpeg' }),
  created_at: '2026-10-02T08:20:00Z',
});

async function show(rows: MessageView[]) {
  const query = { data: cachedThread(detail(rows)), hasNextPage: false, refetch: jest.fn() } as unknown as ThreadQuery;
  await renderWithQuery(
    <ChatActionsProvider phone={PHONE} thread={thread}>
      <MessageList phone={PHONE} query={query} />
      <ChatNotice />
    </ChatActionsProvider>,
  );
  await act(async () => undefined); // /auth/me answers (the bubbles' permission check)
}
const edge = (id: string) => StyleSheet.flatten(screen.getByTestId(`bubble-${id}`).props.style).borderColor;

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('the quote names who wrote it and its first line, and says where a tap goes', async () => {
  await show([inbound, answer]);
  const quote = screen.getByTestId(`quote-${inbound.id}`);
  expect(quote.props.accessibilityLabel).toBe(`${thread.display_name}: ${inbound.body}`);
  expect(quote.props.accessibilityHint).toBe(t.inbox.reply.jump);
});

test('a file without a caption is quoted by its kind', async () => {
  await show([inbound, older]);
  expect(screen.getByTestId('quote-gone').props.accessibilityLabel).toBe(`${thread.display_name}: ${t.inbox.media.image}`);
});

test('a tap on the quote scrolls the inverted list to the original and lights it up a moment', async () => {
  jest.useFakeTimers();
  const toIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
  await show([inbound, answer]);
  await fireEvent.press(screen.getByTestId(`quote-${inbound.id}`));
  // Newest first: the answer is row 0, the original row 1.
  expect(toIndex).toHaveBeenCalledWith({ index: 1, animated: true, viewPosition: 0.5 });
  expect(edge(inbound.id)).toBe(palette.light.lapis);
  await act(() => jest.advanceTimersByTime(LIT_MS));
  expect(edge(inbound.id)).toBe(palette.light.rule);
});

test('a row not laid out yet: near it by the average height, then exactly', async () => {
  jest.useFakeTimers();
  const toIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
  const toOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
  await show([inbound, answer]);
  await act(() => screen.getByTestId('message-list').props.onScrollToIndexFailed({ index: 1, averageItemLength: 80 }));
  expect(toOffset).toHaveBeenCalledWith({ offset: 80, animated: false });
  await act(() => jest.advanceTimersByTime(200));
  expect(toIndex).toHaveBeenCalledWith({ index: 1, animated: true, viewPosition: 0.5 });
});

test('an original older than the loaded pages: the chat says so, nothing scrolls', async () => {
  const toIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
  await show([inbound, older]);
  await fireEvent.press(screen.getByTestId('quote-gone'));
  expect(toIndex).not.toHaveBeenCalled();
  expect(screen.getByText(t.inbox.reply.notLoaded)).toBeTruthy();
});
