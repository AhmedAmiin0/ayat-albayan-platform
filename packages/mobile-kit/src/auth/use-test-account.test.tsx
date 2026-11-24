import { renderHook, waitFor } from '@testing-library/react-native';
import { freshQueryClient, queryWrapper } from '../testing/query';
import { useIsTestAccount } from './use-permissions';

// /auth/me `is_test` (docs/56) drives the family app's test chip.
const mockApiFetch = jest.fn();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));

beforeEach(() => jest.clearAllMocks());

test('true only when /auth/me says is_test: true', async () => {
  mockApiFetch.mockResolvedValue({ id: 'g1', role: 'guardian', permissions: [], is_test: true });
  const { result } = await renderHook(() => useIsTestAccount(), {
    wrapper: queryWrapper(freshQueryClient()),
  });
  await waitFor(() => expect(result.current).toBe(true));
});

test('false on a real account and on an older API without the field', async () => {
  mockApiFetch.mockResolvedValue({ id: 'g1', role: 'guardian', permissions: [] });
  const { result } = await renderHook(() => useIsTestAccount(), {
    wrapper: queryWrapper(freshQueryClient()),
  });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(result.current).toBe(false);
});
