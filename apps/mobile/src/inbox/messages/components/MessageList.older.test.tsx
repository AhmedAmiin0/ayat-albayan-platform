import type { MessageView } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { AT_NEWEST, MessageList, OLDER_THRESHOLD } from './MessageList';
import { cachedThread, detail, inbound, message, PHONE } from '../../shared/thread-fixtures';
import type { useThread } from '../../thread/hooks/use-thread';

// Owner 2026-10-27 «do like WhatsApp»: no «رسائل أقدم» button; reaching the top loads the next page.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
}));

type ThreadQuery = ReturnType<typeof useThread>;
const OLD = message({ id: 'm0', direction: 'inbound', body: 'رسالة قديمة', created_at: '2026-09-29T10:00:00Z' });

function stub(pages: MessageView[][], more: Partial<Record<'hasNextPage' | 'isFetchingNextPage', boolean>> & { fetchNextPage?: jest.Mock } = {}) {
  const fields = { hasNextPage: true, isFetchingNextPage: false, refetch: jest.fn(), fetchNextPage: jest.fn(async () => undefined), ...more };
  return { data: cachedThread(...pages.map((m) => detail(m))), ...fields } as unknown as ThreadQuery;
}
const show = (query: ThreadQuery) => renderWithQuery(<MessageList phone={PHONE} query={query} />);
const reachTop = () => fireEvent(screen.getByTestId('message-list'), 'endReached', { distanceFromEnd: 0 });

afterEach(() => jest.restoreAllMocks());

test('no button: reaching the top loads the next older page once', async () => {
  const fetchNextPage = jest.fn(async () => undefined);
  await show(stub([[inbound]], { fetchNextPage }));
  expect(screen.queryByRole('button', { name: t.inbox.loadOlder })).toBeNull();
  expect(screen.getByTestId('message-list').props.onEndReachedThreshold).toBe(OLDER_THRESHOLD);
  await reachTop();
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  // Never cancels a page a quote jump is already loading.
  expect(fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
});

test('the oldest loaded row gets its day chip only once no older page can continue that day', async () => {
  const view = await show(stub([[inbound]]));
  expect(screen.queryByTestId(`day-${inbound.id}`)).toBeNull();
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound]], { hasNextPage: false })} />);
  expect(screen.getByTestId(`day-${inbound.id}`)).toBeTruthy();
});

test('the list reporting the top twice before the page is in asks once; after it lands, once more', async () => {
  let land: () => void = () => undefined;
  const fetchNextPage = jest.fn(() => new Promise<void>((resolve) => (land = resolve)));
  await show(stub([[inbound]], { fetchNextPage }));
  await reachTop();
  await reachTop();
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  await act(async () => land());
  await reachTop();
  expect(fetchNextPage).toHaveBeenCalledTimes(2);
});

test('never while a page is loading, nor when there is no older page', async () => {
  const fetchNextPage = jest.fn(async () => undefined);
  const view = await show(stub([[inbound]], { fetchNextPage, isFetchingNextPage: true }));
  await reachTop();
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound]], { fetchNextPage, hasNextPage: false })} />);
  await reachTop();
  expect(fetchNextPage).not.toHaveBeenCalled();
});

test('a small spinner at the top (the inverted footer) only while the older page loads', async () => {
  const view = await show(stub([[inbound]], { isFetchingNextPage: true }));
  expect(screen.getByTestId('older-loading')).toBeTruthy();
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound]])} />);
  expect(screen.queryByTestId('older-loading')).toBeNull();
});

test('older rows arrive without moving the bubbles on screen: appended at the top, no scroll, position kept', async () => {
  const toOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
  const toIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
  const again = message({ id: 'm1b', direction: 'inbound', body: 'وأختها', created_at: '2026-10-02T08:10:00Z' });
  const view = await show(stub([[inbound, again]]));
  await view.rerender(<MessageList phone={PHONE} query={stub([[inbound, again], [OLD]])} />);
  const list = screen.getByTestId('message-list');
  // Newest first: the older page lands after the rows on screen (index 0 stays the newest).
  expect(list.props.data.map((m: MessageView) => m.id)).toEqual([again.id, inbound.id, OLD.id]);
  expect(list.props.maintainVisibleContentPosition).toEqual({ minIndexForVisible: 0, autoscrollToTopThreshold: AT_NEWEST });
  expect(toOffset).not.toHaveBeenCalled();
  expect(toIndex).not.toHaveBeenCalled();
});

test('pull to refresh still asks the API again', async () => {
  const query = stub([[inbound]]);
  (query.refetch as jest.Mock).mockResolvedValue(undefined);
  await show(query);
  await act(async () => screen.getByTestId('message-list').props.onRefresh());
  expect(query.refetch).toHaveBeenCalledTimes(1);
});
