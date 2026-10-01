import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { ApiError } from './api';
import { useOptimisticStatus } from './use-optimistic-status';

const mockApiSend = jest.fn();
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const listKey = ['leads', 'list', { status: 'new' }];
const detailKey = ['leads', 'a'];
const seedList = {
  pageParams: [1],
  pages: [
    {
      items: [
        { id: 'a', status: 'new' },
        { id: 'b', status: 'new' },
      ],
      total: 2,
      page: 1,
      pageSize: 25,
    },
  ],
};

function setup() {
  const client = createTestQueryClient();
  client.setQueryData(listKey, seedList);
  client.setQueryData(detailKey, { id: 'a', status: 'new', name: 'Huda' });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  return { client, invalidate, wrapper: queryWrapper(client) };
}

const statusOf = (data: unknown, i: number) => (data as typeof seedList).pages[0]?.items[i]?.status;

beforeEach(() => mockApiSend.mockReset());

test('the new status shows before the server answers, then the resource refetches', async () => {
  let resolve: (v: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((r) => (resolve = r)));
  const { client, invalidate, wrapper } = setup();
  const { result } = await renderHook(() => useOptimisticStatus({ path: '/leads' }), { wrapper });

  await act(async () => result.current.mutate({ id: 'a', status: 'contacted' }));
  await waitFor(() => expect(statusOf(client.getQueryData(listKey), 0)).toBe('contacted'));
  expect(statusOf(client.getQueryData(listKey), 1)).toBe('new');
  expect(client.getQueryData(detailKey)).toMatchObject({ status: 'contacted', name: 'Huda' });
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/leads/a/status', { status: 'contacted' });
  expect(invalidate).not.toHaveBeenCalled();

  await act(async () => resolve({ id: 'a', status: 'contacted' }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leads'] });
});

test('a failed change rolls every cached copy back to the snapshot', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'invalid_transition' }));
  const { client, invalidate, wrapper } = setup();
  const { result } = await renderHook(() => useOptimisticStatus({ path: '/leads' }), { wrapper });

  await act(async () => result.current.mutate({ id: 'a', status: 'converted' }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(client.getQueryData(listKey)).toEqual(seedList);
  expect(client.getQueryData(detailKey)).toEqual({ id: 'a', status: 'new', name: 'Huda' });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leads'] });
});

test('other resources are never touched', async () => {
  mockApiSend.mockResolvedValue(undefined);
  const { client, wrapper } = setup();
  const other = { id: 'a', status: 'new' };
  client.setQueryData(['job-applicants', 'a'], other);
  const { result } = await renderHook(() => useOptimisticStatus({ path: '/leads' }), { wrapper });
  await act(async () => result.current.mutate({ id: 'a', status: 'lost' }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(client.getQueryData(['job-applicants', 'a'])).toBe(other);
});

test('patchPath sends the row PATCH for resources without a /status route (students)', async () => {
  mockApiSend.mockResolvedValue(undefined);
  const client = createTestQueryClient();
  const studentKey = ['students', 's1'];
  client.setQueryData(studentKey, { id: 's1', status: 'trial', name: 'هدى' });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const options = { path: '/students', patchPath: (id: string) => `/students/${id}` };
  const { result } = await renderHook(() => useOptimisticStatus(options), { wrapper: queryWrapper(client) });

  await act(async () => result.current.mutate({ id: 's1', status: 'active' }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/students/s1', { status: 'active' });
  expect(client.getQueryData(studentKey)).toMatchObject({ status: 'active', name: 'هدى' });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['students'] });
});
