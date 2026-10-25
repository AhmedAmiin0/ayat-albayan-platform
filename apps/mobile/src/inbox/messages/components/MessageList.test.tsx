import type { MessageView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { FlatList, StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { AT_NEWEST, MessageList } from './MessageList';
import { cachedThread, delivered, detail, inbound, message, PHONE } from '../../shared/thread-fixtures';
import type { useThread } from '../../thread/hooks/use-thread';

// Owner 2026-10-24 («the chat scrolled to the last point»): every mobile chat opens on the newest
// message. Inverted, so offset 0 is exactly the newest: no scrollToEnd aimed at a guessed height.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
}));

type ThreadQuery = ReturnType<typeof useThread>;
const OLD = message({ id: 'm0', direction: 'inbound', body: 'رسالة قديمة', created_at: '2026-09-29T10:00:00Z' });
const LATER = message({ id: 'm4', direction: 'inbound', body: 'شكرًا', created_at: '2026-10-02T08:20:00Z' });

/** pages[0] is the newest page, as useThread caches it. */
function stub(pages: MessageView[][], more: { hasNextPage?: boolean; fetchNextPage?: () => void } = {}) {
  const fields = { hasNextPage: false, isRefetching: false, isFetchingNextPage: false, refetch: jest.fn(), fetchNextPage: jest.fn(), ...more };
  return { data: cachedThread(...pages.map((m) => detail(m))), ...fields } as unknown as ThreadQuery;
}
const show = (query: ThreadQuery) => renderWithQuery(<MessageList phone={PHONE} query={query} />);
const rowIds = () => screen.getAllByTestId(/^message-row-/).map((n) => String(n.props.testID).replace('message-row-', ''));
const gapOf = (id: string) => StyleSheet.flatten(screen.getByTestId(`message-row-${id}`).props.style).paddingTop;

afterEach(() => jest.restoreAllMocks());

test('opens on the newest: an inverted list, newest first, never a guessed scroll to the end', async () => {
  const toEnd = jest.spyOn(FlatList.prototype, 'scrollToEnd');
  await show(stub([[inbound, delivered], [OLD]]));
  expect(rowIds()).toEqual([delivered.id, inbound.id, OLD.id]);
  const list = screen.getByTestId('message-list');
  expect(list.props.inverted).toBe(true);
  expect(list.props.maintainVisibleContentPosition).toEqual({ minIndexForVisible: 0, autoscrollToTopThreshold: AT_NEWEST });
  expect(toEnd).not.toHaveBeenCalled();
});

test('a message she sends brings her to the newest; one that comes in, or an older page, does not', async () => {
  const toOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
  const view = await show(stub([[inbound]]));
  expect(toOffset).not.toHaveBeenCalled();
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound, delivered]])} />);
  expect(toOffset).toHaveBeenCalledTimes(1);
  expect(toOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound, delivered], [OLD]])} />);
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound, delivered, LATER], [OLD]])} />);
  expect(toOffset).toHaveBeenCalledTimes(1);
});

test("a job's row or a colleague's reply that lands newest leaves her where she is", async () => {
  const toOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
  const job = message({ id: 'm5', status: 'sent', automatic: true, created_at: '2026-10-02T08:30:00Z' });
  const colleague = message({ id: 'm6', status: 'sent', sender_name: 'سارة', created_at: '2026-10-02T08:40:00Z' });
  const view = await show(stub([[inbound]]));
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound, job]])} />);
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound, job, colleague]])} />);
  expect(toOffset).not.toHaveBeenCalled();
});

test("an empty chat keeps its empty state upright: the wrapper takes the inverted list's flip back", async () => {
  await show(stub([[]]));
  expect(screen.getByText(t.inbox.empty)).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('message-empty').props.style).transform).toContainEqual({ scaleY: -1 });
});

test('«رسائل أقدم» shows only while there are older pages, and loads the next one', async () => {
  const fetchNextPage = jest.fn();
  const view = await show(stub([[inbound]], { hasNextPage: true, fetchNextPage }));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.loadOlder }));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound]])} />);
  expect(screen.queryByRole('button', { name: t.inbox.loadOlder })).toBeNull();
});

test('the gap over a message comes from the older one above it: none, same side, side change', async () => {
  const again = message({ id: 'm1b', direction: 'inbound', body: 'وأختها أيضًا', created_at: '2026-10-02T08:01:00Z' });
  await show(stub([[inbound, again, delivered]]));
  expect(gapOf(inbound.id)).toBe(0);
  expect(gapOf(again.id)).toBe(4);
  expect(gapOf(delivered.id)).toBe(8);
});
