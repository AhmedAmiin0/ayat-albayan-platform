import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { teacherMoveTarget, timesMoveTarget } from './move-target';
import { CHECK, NEW_T, SUB, SUN } from './course-actions-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const STUDENT = '0b6a7c1e-2222-4a8e-9b00-000000000002';
const body = {
  subscriptionId: SUB,
  byday: [0, 3],
  startTimeLocal: '17:00',
  startsOn: '2026-10-04',
  startsAt: SUN,
};
const saved = { subscriptionId: SUB, ruleIds: [SUB], endsOn: CHECK.endsOn };
const clientRequestId = '00000000-0000-4000-8000-000000000001';

describe('the profile move targets', () => {
  afterEach(() => apiSend.mockReset());

  it('checks and saves new times on the student\'s course-times routes', async () => {
    apiSend.mockResolvedValueOnce(CHECK).mockResolvedValueOnce(saved);
    const target = timesMoveTarget(STUDENT);
    await expect(target.check(body)).resolves.toEqual(CHECK);
    expect(apiSend).toHaveBeenLastCalledWith(
      'POST',
      `/students/${STUDENT}/course-times/change/check`,
      body,
    );
    await target.change({ ...body, clientRequestId });
    expect(apiSend).toHaveBeenLastCalledWith('POST', `/students/${STUDENT}/course-times/change`, {
      ...body,
      clientRequestId,
    });
  });

  it('sends the new teacher with the check and the change', async () => {
    apiSend.mockResolvedValueOnce(CHECK).mockResolvedValueOnce(saved);
    const target = teacherMoveTarget(STUDENT, NEW_T);
    await target.check(body);
    const path = `/students/${STUDENT}/course-teacher/change`;
    expect(apiSend).toHaveBeenLastCalledWith('POST', `${path}/check`, {
      ...body,
      teacherId: NEW_T,
    });
    await target.change({ ...body, clientRequestId });
    expect(apiSend).toHaveBeenLastCalledWith('POST', path, {
      ...body,
      clientRequestId,
      teacherId: NEW_T,
    });
  });

  it('keeps the two tables apart in the query cache', () => {
    expect(timesMoveTarget(STUDENT).key).not.toBe(teacherMoveTarget(STUDENT, NEW_T).key);
    expect(teacherMoveTarget(STUDENT, NEW_T).key).not.toBe(teacherMoveTarget(STUDENT, SUB).key);
  });

  it('names its own refusals and leaves the rest to the booking', () => {
    const { errorText } = timesMoveTarget(STUDENT);
    const refusal = (code: string) => new ApiError(400, { code });
    expect(errorText?.(refusal('same_teacher'))).toBe(t.courseActions.errors.same_teacher);
    expect(errorText?.(refusal('conflict'))).toBeNull();
  });
});
