import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID, TEACHER, TEACHER_ID } from '@/modules/teaching/lessons/lessons.fakes';
import { lessonsApp } from '@/modules/teaching/lessons/test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const url = `/teachers/me/lessons/${LESSON_ID}/confirm-attendance`;

describe('POST /teachers/me/lessons/:id/confirm-attendance — «سأحضر» (docs/46 C4, D1)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('one atomic write for HER teachers row; the status is never written', async () => {
    const res = await h.call({ method: 'POST', url, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: LESSON_ID, status: 'scheduled' });
    const write = { lessonId: LESSON_ID, teacherId: TEACHER_ID, actorId: TEACHER.id };
    expect(h.confirms.confirm).toHaveBeenCalledWith(write);
    expect(h.writer.apply).not.toHaveBeenCalled();
  });

  it.each([
    ['not_owner', 403, undefined],
    ['not_found', 404, undefined],
    ['started', 409, 'lesson_started'],
    ['closed', 409, 'lesson_closed'],
  ] as const)('%s → %i', async (outcome, status, code) => {
    h.confirms.confirm.mockResolvedValue(outcome);
    const res = await h.call({ method: 'POST', url, token: 'teacher' });
    expect(res.statusCode).toBe(status);
    if (code) expect(res.json().code).toBe(code);
  });

  it('a guardian is 403; an unlinked teacher 404 teacher_not_linked; nothing written', async () => {
    expect((await h.call({ method: 'POST', url, token: 'guardian' })).statusCode).toBe(403);
    const res = await h.call({ method: 'POST', url, token: 'unlinked' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'teacher_not_linked']);
    expect(h.confirms.confirm).not.toHaveBeenCalled();
  });
});
