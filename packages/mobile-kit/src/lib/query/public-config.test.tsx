import { PUBLIC_SETTING_DEFAULTS, type PublicConfig } from '@ab/settings';
import { renderHook, waitFor } from '@testing-library/react-native';
import { freshQueryClient, queryWrapper } from '../../testing/query';
import {
  publicConfigQuery,
  useJoinWindow,
  usePublicConfig,
  useUploadMaxBytes,
} from './public-config';

const mockApiFetch = jest.fn();
jest.mock('../http/api', () => ({
  ...jest.requireActual('../http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));

beforeEach(() => jest.clearAllMocks());

test('keeps the cache key and the 5-minute stale time the admin save invalidates', () => {
  expect(publicConfigQuery.queryKey).toEqual(['settings', 'public']);
  expect(publicConfigQuery.staleTime).toBe(300_000);
});

test('outside a QueryClientProvider: the registry defaults, and no request', async () => {
  const { result } = await renderHook(() => usePublicConfig());
  expect(result.current).toEqual(PUBLIC_SETTING_DEFAULTS);
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('reads GET /settings/public; the hooks follow the academy values', async () => {
  const answer: PublicConfig = {
    ...PUBLIC_SETTING_DEFAULTS,
    join_opens_before_min: 45,
    upload_max_mb: 3,
    custom: {},
  };
  mockApiFetch.mockResolvedValue(answer);
  const wrapper = queryWrapper(freshQueryClient());
  const useRead = () => ({ win: useJoinWindow(), max: useUploadMaxBytes() });
  const { result } = await renderHook(useRead, { wrapper });
  await waitFor(() => expect(result.current.win.opensBeforeMin).toBe(45));
  expect(result.current.max).toBe(3 * 1024 * 1024);
  expect(mockApiFetch).toHaveBeenCalledWith('/settings/public');
});

test('odd values in the answer: their defaults stand, the read still succeeds', async () => {
  mockApiFetch.mockResolvedValue({ upload_max_mb: 'ten', family_chat_enabled: 'yes' });
  const client = freshQueryClient();
  const wrapper = queryWrapper(client);
  const { result } = await renderHook(() => usePublicConfig(), { wrapper });
  const status = () => client.getQueryState(publicConfigQuery.queryKey)?.status;
  await waitFor(() => expect(status()).toBe('success'));
  // The hook gives the public settings (PublicSettings): every key on its default.
  expect(result.current).toMatchObject(PUBLIC_SETTING_DEFAULTS);
});
