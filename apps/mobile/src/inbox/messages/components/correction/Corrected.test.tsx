import type { MessageView } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { FlatList, StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from '@/inbox/thread/components/ChatActionsProvider';
import { MessageList } from '@/inbox/messages/components/MessageList';
import { cachedThread, detail, message, PHONE, thread } from '@/inbox/shared/thread-fixtures';
import type { useThread } from '@/inbox/thread/hooks/use-thread';
import { CORRECTED_OPACITY } from './Corrected';

// «تعديل» (owner 2026-11-07): the original greys with «صُحِّحت»; a tap goes to the correction.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
}));

type ThreadQuery = ReturnType<typeof useThread>;
const sent = (id: string, at: string, more: Partial<MessageView> = {}) =>
  message({ id, body: `نص ${id}`, status: 'delivered', created_at: at, ...more });
const original = sent('o1', '2026-10-02T08:00:00Z');
const first = sent('c1', '2026-10-02T08:10:00Z', { corrects_id: 'o1' });
const newest = sent('c2', '2026-10-02T08:20:00Z', { corrects_id: 'o1' });
const other = sent('x1', '2026-10-02T08:30:00Z');

async function show(rows: MessageView[]) {
  const data = cachedThread(detail(rows));
  const query = { data, hasNextPage: false, refetch: jest.fn() } as unknown as ThreadQuery;
  await renderWithQuery(
    <ChatActionsProvider phone={PHONE} thread={thread}>
      <MessageList phone={PHONE} query={query} />
    </ChatActionsProvider>,
  );
  await act(async () => undefined);
}

afterEach(() => jest.restoreAllMocks());

test('the original is greyed and marked; its corrections and other bubbles are not', async () => {
  await show([original, first, newest, other]);
  const frame = screen.getByTestId('corrected-c2');
  expect(StyleSheet.flatten(frame.props.style).opacity).toBe(CORRECTED_OPACITY);
  expect(screen.getAllByTestId('corrected-mark')).toHaveLength(1);
  expect(screen.getByText(t.inbox.correction.mark)).toBeTruthy();
  expect(screen.queryByTestId('corrected-c1')).toBeNull();
});

test('a tap on «صُحِّحت» scrolls to the newest correction', async () => {
  const toIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
  await show([original, first, newest, other]);
  const mark = screen.getByRole('button', { name: t.inbox.correction.jump });
  await fireEvent.press(mark);
  // Newest first: x1, c2, c1, o1.
  expect(toIndex).toHaveBeenCalledWith({ index: 1, animated: true, viewPosition: 0.5 });
});

test('no correction loaded: no mark, no greying', async () => {
  await show([original, other]);
  expect(screen.queryByTestId('corrected-mark')).toBeNull();
  expect(screen.queryByTestId('corrected-c2')).toBeNull();
});
