import { pathKey } from '@ab/mobile-kit';
import { SETTING_DEFAULTS } from '@ab/settings';
import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useSettings } from './use-settings';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}));

async function read(answer: unknown) {
  mockApiFetch.mockReset().mockResolvedValue(answer);
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useSettings(), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  return { client, result };
}

test('reads GET /settings under its path key', async () => {
  const { client, result } = await read(SETTING_DEFAULTS);
  expect(mockApiFetch).toHaveBeenCalledWith('/settings');
  expect(result.current.data).toEqual(SETTING_DEFAULTS);
  expect(client.getQueryData(pathKey('/settings'))).toEqual(SETTING_DEFAULTS);
});

test('settings outside the shared schema fail the read', async () => {
  const { result } = await read({ ...SETTING_DEFAULTS, reminder_minutes_before: 1 });
  expect(result.current.isError).toBe(true);
});
