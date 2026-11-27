import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { teacherStudentFileCalls } from '../teacher-student-api';

const ID = '11111111-1111-4111-8111-111111111111';
const totals = {
  held: 0,
  late: 0,
  absent: 0,
  excused: 0,
  cancelled_by_teacher: 0,
  cancelled_by_admin: 0,
  rescheduled: 0,
  unmarked: 0,
};
const TABLE = { month: '2026-11', months: ['2026-11'], items: [], totals, mine: true };
const HEAD = {
  id: ID,
  code: 'AB-0001',
  name: 'طالب',
  status: 'active',
  course: null,
  upcoming: [],
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('teacher student file calls', () => {
  it('reads the head on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(HEAD);
    await expect(teacherStudentFileCalls(client).head(ID)).resolves.toEqual(HEAD);
    expect(apiFetch).toHaveBeenCalledWith(`/teachers/me/students/${ID}`);
  });

  it('reads one month, or the current one without a month', async () => {
    const { client, apiFetch } = clientAnswering(TABLE);
    const calls = teacherStudentFileCalls(client);
    await expect(calls.attendance({ studentId: ID, month: '2026-11' })).resolves.toEqual(TABLE);
    await calls.attendance({ studentId: ID, month: undefined });
    expect(apiFetch.mock.calls).toEqual([
      [`/teachers/me/students/${ID}/attendance?month=2026-11`],
      [`/teachers/me/students/${ID}/attendance`],
    ]);
  });

  it('throws bad_response for a head that carries money', async () => {
    const { client } = clientAnswering({ ...HEAD, price: 100 });
    const failure = await teacherStudentFileCalls(client)
      .head(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
