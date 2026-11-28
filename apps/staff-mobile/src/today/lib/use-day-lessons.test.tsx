import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { pending } from '@/today/testing/fixtures';
import { answered } from '@/today/testing/answered';
import { useDayLessons } from './use-day-lessons';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}));

const NOW = new Date('2026-10-01T09:00:00.000Z');

async function read(answer: unknown) {
  mockApiFetch.mockReset().mockResolvedValue(answer);
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useDayLessons(NOW), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  return result;
}

test('reads GET /lessons/day for the Riyadh day and keeps well-formed lessons', async () => {
  const result = await read([answered(pending)]);
  expect(mockApiFetch).toHaveBeenCalledWith('/lessons/day?date=2026-10-01&tz=Asia%2FRiyadh');
  expect(result.current.data).toEqual([answered(pending)]);
});

test('an answer that is not a lesson list fails the read', async () => {
  const result = await read({ lessons: [] });
  expect(result.current.error).toMatchObject({ body: { code: 'bad_response' } });
});
