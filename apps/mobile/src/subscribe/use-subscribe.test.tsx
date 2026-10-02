import { act, renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { CHILD, saved } from './fixtures';
import { useCreateSubscription, type SubscribeInput } from './use-subscribe';

const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const input: SubscribeInput = {
  studentId: CHILD,
  pricing: { duration: 45, discount: 0, tier: 'standard' },
  startsOn: '2026-10-03',
};
const keyOf = (call: number) => (mockApiSend.mock.calls[call]?.[2] as { clientRequestId: string }).clientRequestId;

const setup = () => renderHook(() => useCreateSubscription(), { wrapper: queryWrapper(createTestQueryClient()) });

beforeEach(() => jest.clearAllMocks());

test('a double tap joins the save in flight: one POST /subscriptions with a key', async () => {
  mockApiSend.mockResolvedValue(saved('new-sub'));
  const { result } = await setup();
  const both = await act(() => Promise.all([result.current.mutateAsync(input), result.current.mutateAsync(input)]));
  expect(both.map((s) => s.id)).toEqual(['new-sub', 'new-sub']);
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/subscriptions', { ...input, notes: null, clientRequestId: keyOf(0) });
  expect(keyOf(0)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/);
});

test('a retry after a 502 (the row may exist) re-sends the same key, so the API replays the first package', async () => {
  mockApiSend.mockRejectedValueOnce(new Error('502')).mockResolvedValueOnce(saved('new-sub'));
  const { result } = await setup();
  await act(() => result.current.mutateAsync(input).catch(() => undefined));
  const retried = await act(() => result.current.mutateAsync(input));
  expect(retried.id).toBe('new-sub');
  expect(keyOf(1)).toBe(keyOf(0));
});

test('another child or day is another package: a new key', async () => {
  mockApiSend.mockResolvedValue(saved('new-sub'));
  const { result } = await setup();
  await act(() => result.current.mutateAsync(input));
  await act(() => result.current.mutateAsync({ ...input, startsOn: '2026-10-04' }));
  expect(keyOf(1)).not.toBe(keyOf(0));
});
