import { mockCall } from '@ab/testing/mock-call';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { freshQueryClient, queryWrapper } from '../../testing/query';
import { useMarkRead, useNotifications } from '../use-notifications';

const mockApi = mockCall();
jest.mock('../../lib/http/api', () => ({
  ...jest.requireActual('../../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const PAGE = { items: [], total: 0, page: 1, pageSize: 20, unread: 2 };
const wrapper = () => ({ wrapper: queryWrapper(freshQueryClient()) });

beforeEach(() => mockApi.reset());

test('the bell reads the newest 20 rows through the list route', async () => {
  mockApi.answer('GET', '/me/notifications', PAGE);
  const { result } = await renderHook(() => useNotifications(), wrapper());
  await waitFor(() => expect(result.current.data).toEqual(PAGE));
  expect(mockApi.reads()).toEqual([
    { method: 'GET', path: '/me/notifications?page=1&pageSize=20' },
  ]);
});

test('marking reads the given ids, or every unread row with an empty body', async () => {
  const { result } = await renderHook(() => useMarkRead(), wrapper());
  await act(async () => result.current.mutateAsync(['n1']));
  await act(async () => result.current.mutateAsync(undefined));
  expect(mockApi.writes()).toEqual([
    { method: 'POST', path: '/me/notifications/read', body: { ids: ['n1'] } },
    { method: 'POST', path: '/me/notifications/read', body: {} },
  ]);
});
