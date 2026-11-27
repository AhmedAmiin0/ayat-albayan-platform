import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { courseTeacherCalls, courseTimesCalls } from './course-move-api';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const SUB = 'e2222222-2222-4222-8222-222222222222';
const TEACHER = 'e3333333-3333-4333-8333-333333333333';
const CHECK = { conflicts: [], remaining: 6, endsOn: '2027-01-30' };
const MOVE = {
  subscriptionId: SUB,
  byday: [2],
  startTimeLocal: '17:00',
  startsOn: '2026-12-01',
  startsAt: '2026-12-01T15:00:00Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('course move calls', () => {
  it("reads the student's named package, or the current one without a name", async () => {
    const { client, apiFetch } = clientAnswering({});
    const times = courseTimesCalls(client);
    await times.view(STUDENT, { subscriptionId: SUB }).catch(() => null);
    expect(apiFetch).toHaveBeenCalledWith(
      `/students/${STUDENT}/course-times/change?subscriptionId=${SUB}`,
    );
    await courseTeacherCalls(client).view(STUDENT, {}).catch(() => null);
    expect(apiFetch).toHaveBeenLastCalledWith(`/students/${STUDENT}/course-teacher/change`);
  });

  it('POSTs the times check under the times route and answers its clashes', async () => {
    const { client, apiSend } = clientAnswering(CHECK);
    await expect(courseTimesCalls(client).check(STUDENT, MOVE)).resolves.toEqual(CHECK);
    const path = `/students/${STUDENT}/course-times/change/check`;
    expect(apiSend).toHaveBeenCalledWith('POST', path, MOVE);
  });

  it('POSTs the teacher check with its new teacher under the teacher route', async () => {
    const { client, apiSend } = clientAnswering(CHECK);
    const body = { ...MOVE, teacherId: TEACHER };
    await courseTeacherCalls(client).check(STUDENT, body);
    const path = `/students/${STUDENT}/course-teacher/change/check`;
    expect(apiSend).toHaveBeenCalledWith('POST', path, body);
  });

  it('reads the teachers to pick from for the student', async () => {
    const { client, apiFetch } = clientAnswering([]);
    await expect(courseTeacherCalls(client).teachers(STUDENT)).resolves.toEqual([]);
    expect(apiFetch).toHaveBeenCalledWith(`/students/${STUDENT}/course-teacher/teachers`);
  });

  it('throws bad_response for a change answer without its rules', async () => {
    const { client } = clientAnswering({ subscriptionId: SUB, endsOn: null });
    const body = { ...MOVE, clientRequestId: SUB };
    const failure = await courseTimesCalls(client)
      .change(STUDENT, body)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
