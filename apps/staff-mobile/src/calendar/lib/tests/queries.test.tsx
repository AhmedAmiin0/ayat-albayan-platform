import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useWeekLessons } from '@/calendar/lib/queries';
import { pending } from '@/today/testing/fixtures';
import { answered } from '@/today/testing/answered';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}));

const TEACHER = '00000000-0000-4000-8000-000000000001';
const WEEK = { from: '2026-09-26T21:00:00.000Z', to: '2026-10-03T21:00:00.000Z', teacherId: TEACHER };

async function read(answer: unknown) {
  mockApiFetch.mockReset().mockResolvedValue(answer);
  const client = createTestQueryClient();
  const hook = () => useWeekLessons(WEEK);
  const { result } = await renderHook(hook, { wrapper: queryWrapper(client) });
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  return result;
}

test('reads GET /lessons for the teacher week and keeps well-formed lessons', async () => {
  const result = await read([answered(pending)]);
  expect(mockApiFetch).toHaveBeenCalledWith(
    `/lessons?from=2026-09-26T21%3A00%3A00.000Z&to=2026-10-03T21%3A00%3A00.000Z&teacherId=${TEACHER}`,
  );
  expect(result.current.data).toEqual([answered(pending)]);
});

test('a lesson without a uuid fails the read', async () => {
  const result = await read([pending]);
  expect(result.current.error).toMatchObject({ body: { code: 'bad_response' } });
});
