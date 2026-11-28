import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { answeredOverview, OVERVIEW } from '@/calendar/overview/overview-fixtures';
import { useOverview } from '@/calendar/overview/use-overview';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}));

const WEEK = { from: '2026-09-25T21:00:00.000Z', to: '2026-10-02T21:00:00.000Z' };

async function read(answer: unknown) {
  mockApiFetch.mockReset().mockResolvedValue(answer);
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useOverview(WEEK), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  return result;
}

test('reads GET /lessons/overview for the week and keeps a well-formed answer', async () => {
  const result = await read(answeredOverview(OVERVIEW));
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/lessons/overview?from=2026-09-25T21%3A00%3A00.000Z&to=2026-10-02T21%3A00%3A00.000Z',
  );
  expect(result.current.data).toEqual(answeredOverview(OVERVIEW));
});

test('an answer that is not an overview fails the read', async () => {
  const result = await read({ teachers: 'none' });
  expect(result.current.error).toMatchObject({ body: { code: 'bad_response' } });
});
