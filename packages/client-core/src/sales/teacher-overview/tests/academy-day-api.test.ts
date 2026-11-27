import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesAcademyDayCalls } from '../academy-day-api';

const TEACHER = '11111111-1111-4111-8111-111111111111';
const DAY = { date: '2026-10-11', lessons: [] };
const LIVE = {
  lesson_id: 'les-1',
  starts_at: '2026-10-11T16:00:00.000Z',
  ends_at: '2026-10-11T16:30:00.000Z',
  status: 'confirmed',
  teacher_name: 'أبرار',
  student_names: ['ياسمين'],
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('sales academy day calls', () => {
  it('reads a day on the path of today, with the teacher when given', async () => {
    const { client, apiFetch } = clientAnswering(DAY);
    const calls = salesAcademyDayCalls(client);
    await expect(calls.day({ date: '2026-10-11' })).resolves.toEqual(DAY);
    await calls.day({ date: '2026-10-11', teacherId: TEACHER });
    expect(apiFetch.mock.calls).toEqual([
      ['/sales/schedule?date=2026-10-11'],
      [`/sales/schedule?date=2026-10-11&teacherId=${TEACHER}`],
    ]);
  });

  it('reads the running lessons on the path of today', async () => {
    const { client, apiFetch } = clientAnswering([LIVE]);
    await expect(salesAcademyDayCalls(client).live()).resolves.toEqual([LIVE]);
    expect(apiFetch).toHaveBeenCalledWith('/sales/live');
  });

  it('throws bad_response for a running lesson with an unknown status', async () => {
    const { client } = clientAnswering([{ ...LIVE, status: 'lost' }]);
    const failure = await salesAcademyDayCalls(client)
      .live()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
