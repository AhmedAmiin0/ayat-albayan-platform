import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { answered } from '@/today/testing/answered';
import { useAdminReplyLesson } from './reply-lesson-read';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}));

const ASKED = answered(lesson({ id: 'l-1', starts_at: '2099-10-04T14:00:00.000Z' }));
const OTHER = answered(lesson({ id: 'l-2', starts_at: '2099-10-04T14:00:00.000Z' }));
const REPLY = { id: ASKED.id, starts_at: ASKED.starts_at, ends_at: ASKED.ends_at, status: null };

async function read(answer: unknown) {
  mockApiFetch.mockReset().mockResolvedValue(answer);
  const client = createTestQueryClient();
  const useReply = () => useAdminReplyLesson(REPLY);
  const { result } = await renderHook(useReply, { wrapper: queryWrapper(client) });
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  return result;
}

test('reads GET /lessons over the minute the lesson starts and picks it by id', async () => {
  const result = await read([OTHER, ASKED]);
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/lessons?from=2099-10-04T14%3A00%3A00.000Z&to=2099-10-04T14%3A01%3A00.000Z',
  );
  expect(result.current.data).toEqual(ASKED);
});

test('null when the minute holds another lesson only', async () => {
  const result = await read([OTHER]);
  expect(result.current.data).toBeNull();
});

test('an answer that is not a lesson list fails the read', async () => {
  const result = await read([{ id: 'l-1' }]);
  expect(result.current.error).toMatchObject({ body: { code: 'bad_response' } });
});
