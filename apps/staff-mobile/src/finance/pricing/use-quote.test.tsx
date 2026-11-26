import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { bulkSa } from './fixtures';
import { DEFAULT_SELECTION } from './selection';
import { useQuote } from './use-quote';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const TODAY = '/pricing/quote?tier=standard&duration=45&country=SA&students=1&discount=0';
const wrapper = () => queryWrapper(createTestQueryClient());

beforeEach(() => mockApiFetch.mockReset().mockResolvedValue(bulkSa));

test('with no rounding it asks exactly what the calculator always asked', async () => {
  const hook = await renderHook(() => useQuote(DEFAULT_SELECTION), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.data).toEqual(bulkSa));
  expect(mockApiFetch.mock.calls).toEqual([[TODAY]]);
});

test('a rounding other than nearest goes in the request', async () => {
  const ask = { rounding: 'up' } as const;
  const hook = await renderHook(() => useQuote(DEFAULT_SELECTION, ask), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.data).toEqual(bulkSa));
  expect(mockApiFetch.mock.calls).toEqual([[`${TODAY}&rounding=up`]]);
});

test('nearest asks today’s request, so a quote already cached is reused', async () => {
  const ask = { rounding: 'nearest' } as const;
  const hook = await renderHook(() => useQuote(DEFAULT_SELECTION, ask), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.data).toEqual(bulkSa));
  expect(mockApiFetch.mock.calls).toEqual([[TODAY]]);
});

test('switched off it asks nothing', async () => {
  const ask = { enabled: false };
  const hook = await renderHook(() => useQuote(DEFAULT_SELECTION, ask), { wrapper: wrapper() });
  expect(hook.result.current.fetchStatus).toBe('idle');
  expect(hook.result.current.data).toBeUndefined();
  expect(mockApiFetch).not.toHaveBeenCalled();
});
