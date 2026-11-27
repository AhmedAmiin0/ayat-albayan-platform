import { pathKey } from '@ab/mobile-kit';
import { SETTING_DEFAULTS } from '@ab/settings';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useSaveValue } from './use-save-value';

const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));

const answerOf = (moved: string[]) => ({
  ...SETTING_DEFAULTS,
  upload_max_mb: 7,
  saved: moved.length > 0 ? [] : ['upload_max_mb'],
  moved,
  invalid: [],
});

async function save(answer: unknown) {
  mockApiSend.mockReset().mockResolvedValue(answer);
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useSaveValue(), { wrapper: queryWrapper(client) });
  await act(async () => result.current.mutate({ key: 'upload_max_mb', value: 7 }));
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  return { client, result };
}

test('one PATCH /settings with the camelCase field; the answer replaces the cached settings', async () => {
  const { client, result } = await save(answerOf([]));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { uploadMaxMb: 7 });
  expect(result.current.data?.outcome).toBe('saved');
  expect(client.getQueryData(pathKey('/settings'))).toEqual(answerOf([]));
});

test('a key another page owns comes back as moved', async () => {
  const { result } = await save(answerOf(['upload_max_mb']));
  expect(result.current.data?.outcome).toBe('moved');
});

test('an answer outside the shared schema fails the save', async () => {
  const { result } = await save({ saved: [] });
  expect(result.current.isError).toBe(true);
});
