import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useStudentStatus } from './use-student-status';

const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const listKey = ['students', 'list', { search: 'هدى' }];
const detailKey = ['students', 's1'];
const seedList = {
  pageParams: [1],
  pages: [{ items: [{ id: 's1', status: 'trial' }], total: 1, page: 1, pageSize: 25 }],
};
const seedDetail = { id: 's1', status: 'trial', name: 'هدى' };

function setup() {
  const client = createTestQueryClient();
  client.setQueryData(listKey, seedList);
  client.setQueryData(detailKey, seedDetail);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  return { client, invalidate, wrapper: queryWrapper(client) };
}

beforeEach(() => mockApiSend.mockReset());

test('PATCH /students/:id { status }; list and detail flip before the answer', async () => {
  let resolve: (v: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((r) => (resolve = r)));
  const { client, invalidate, wrapper } = setup();
  const { result } = await renderHook(() => useStudentStatus(), { wrapper });

  await act(async () => result.current.mutate({ id: 's1', status: 'active' }));
  await waitFor(() => expect(client.getQueryData(detailKey)).toMatchObject({ status: 'active' }));
  expect(client.getQueryData(listKey)).toMatchObject({ pages: [{ items: [{ status: 'active' }] }] });
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/students/s1', { status: 'active' });

  await act(async () => resolve({ id: 's1', status: 'active' }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['students'] });
});

test('a failed change rolls list and detail back', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400));
  const { client, invalidate, wrapper } = setup();
  const { result } = await renderHook(() => useStudentStatus(), { wrapper });

  await act(async () => result.current.mutate({ id: 's1', status: 'churned' }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(client.getQueryData(listKey)).toEqual(seedList);
  expect(client.getQueryData(detailKey)).toEqual(seedDetail);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['students'] });
});
