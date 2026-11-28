import { pathKey } from '@ab/mobile-kit';
import { SETTING_DEFAULTS } from '@ab/settings';
import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useRenewalThreshold } from './queries';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}));

async function threshold(answer: unknown) {
  mockApiFetch.mockReset().mockResolvedValue(answer);
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useRenewalThreshold(), {
    wrapper: queryWrapper(client),
  });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  return { client, result };
}

test('reads the renewal threshold of GET /settings under its path key', async () => {
  const settings = { ...SETTING_DEFAULTS, renewal_alert_remaining: 3 };
  const { client, result } = await threshold(settings);
  await waitFor(() => expect(result.current).toBe(3));
  expect(mockApiFetch).toHaveBeenCalledWith('/settings');
  expect(client.getQueryData(pathKey('/settings'))).toEqual(settings);
});

test('settings outside the shared schema give no threshold', async () => {
  const { client, result } = await threshold({ renewal_alert_remaining: 3 });
  await waitFor(() =>
    expect(client.getQueryState(pathKey('/settings'))?.status).toBe('error'),
  );
  expect(result.current).toBeUndefined();
});
