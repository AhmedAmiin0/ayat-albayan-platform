import { act, renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { balance, CHILD, saved } from './fixtures';
import { useCreateSubscription, type SubscribeInput } from './use-subscribe';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const input: SubscribeInput = {
  studentId: CHILD,
  pricing: { duration: 45, discount: 0, tier: 'standard' },
  startsOn: '2026-10-03',
};
const offline = () => new TypeError('Network request failed');

function setup() {
  const client = createTestQueryClient();
  return renderHook(() => useCreateSubscription(), { wrapper: queryWrapper(client) });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(balance(saved('old-sub')));
});

test('a double tap joins the save in flight: one POST /subscriptions', async () => {
  mockApiSend.mockResolvedValue(saved('new-sub'));
  const { result } = await setup();
  const both = await act(() =>
    Promise.all([result.current.mutateAsync(input), result.current.mutateAsync(input)]),
  );
  expect(both.map((s) => s.id)).toEqual(['new-sub', 'new-sub']);
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/subscriptions', { ...input, notes: null });
});

test('no answer, but it was saved: the retry finds the new package and does not post again', async () => {
  mockApiSend.mockRejectedValueOnce(offline());
  const { result } = await setup();
  const lost = await act(() => result.current.mutateAsync(input).catch((e: unknown) => e));
  expect(lost).toBeInstanceOf(TypeError);

  mockApiFetch.mockResolvedValue(balance(saved('new-sub')));
  const retried = await act(() => result.current.mutateAsync(input));
  expect(retried.id).toBe('new-sub');
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(mockApiFetch).toHaveBeenLastCalledWith(`/students/${CHILD}/balance`);
});

test('no answer and nothing saved: the retry posts again', async () => {
  mockApiSend.mockRejectedValueOnce(offline()).mockResolvedValueOnce(saved('new-sub'));
  const { result } = await setup();
  await act(() => result.current.mutateAsync(input).catch(() => undefined));
  const retried = await act(() => result.current.mutateAsync(input));
  expect(retried.id).toBe('new-sub');
  expect(mockApiSend).toHaveBeenCalledTimes(2);
});
