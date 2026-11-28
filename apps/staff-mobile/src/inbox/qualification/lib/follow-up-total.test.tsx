import { pathKey } from '@ab/mobile-kit';
import { SETTING_DEFAULTS } from '@ab/settings';
import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useFollowUpTotal } from './queries';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}));

async function total(answer: unknown) {
  mockApiFetch.mockReset().mockResolvedValue(answer);
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useFollowUpTotal(), {
    wrapper: queryWrapper(client),
  });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  return { client, result };
}

test('counts the follow-ups of GET /settings, read under its path key', async () => {
  const settings = { ...SETTING_DEFAULTS, follow_up_hours: [24, 72, 168] };
  const { client, result } = await total(settings);
  await waitFor(() => expect(result.current).toBe(3));
  expect(mockApiFetch).toHaveBeenCalledWith('/settings');
  expect(client.getQueryData(pathKey('/settings'))).toEqual(settings);
});

test('settings outside the shared schema give no total', async () => {
  const { client, result } = await total({ follow_up_hours: [24, 72, 168] });
  await waitFor(() =>
    expect(client.getQueryState(pathKey('/settings'))?.status).toBe('error'),
  );
  expect(result.current).toBeUndefined();
});
