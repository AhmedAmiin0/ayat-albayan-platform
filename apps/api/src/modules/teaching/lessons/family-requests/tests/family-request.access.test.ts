import type { LessonView } from '@ab/schedule';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { ADMIN, fakeStore, lessonRow, STUDENT_ID, TEACHER } from '@/modules/teaching/lessons/lessons.fakes';
import type { LessonProposalRepo } from '@/modules/teaching/lessons/proposals/lesson-proposals.repo';
import type { TeacherCancelRepo } from '@/modules/teaching/lessons/teacher-me/teacher-cancel.repo';
import { FamilyRequestAccess } from '@/modules/teaching/lessons/family-requests/family-request.access';

const SALES: AuthUser = { id: 'sa-1', email: null, role: 'sales' };
const OTHER_SALES: AuthUser = { id: 'sa-2', email: null, role: 'sales' };
const owners = {
  ownersOf: vi.fn(async (ids: readonly string[]) => new Map(ids.map((id) => [id, ['sa-1']]))),
};
const FAMILY_ROW = { id: 'p1', lesson_id: 'l1', requested_by: 'family' };

const access = (proposal: object | null = FAMILY_ROW) =>
  new FamilyRequestAccess(
    owners as unknown as TeacherCancelRepo,
    { get: vi.fn(async () => proposal) } as unknown as LessonProposalRepo,
    fakeStore(lessonRow()).store,
  );
const view = (id: string) => ({ id, students: [{ id: STUDENT_ID }] }) as unknown as LessonView;

describe('FamilyRequestAccess: admins and the owning assistant answer (owner 2026-11-17)', () => {
  it('an admin answers any; the assistant who owns the student hers only; a teacher none', async () => {
    expect(await access().mayAnswer(ADMIN, [STUDENT_ID])).toBe(true);
    expect(await access().mayAnswer(SALES, [STUDENT_ID])).toBe(true);
    expect(owners.ownersOf).toHaveBeenCalledWith([STUDENT_ID]);
    expect(await access().mayAnswer(OTHER_SALES, [STUDENT_ID])).toBe(false);
    expect(await access().mayAnswer(TEACHER, [STUDENT_ID])).toBe(false);
  });

  it('the list keeps the lessons this user answers, the owners read once', async () => {
    owners.ownersOf.mockClear();
    expect((await access().visible(SALES, [view('a'), view('b')])).map((l) => l.id)).toEqual(['a', 'b']);
    expect(owners.ownersOf).toHaveBeenCalledTimes(1);
    expect(await access().visible(OTHER_SALES, [view('a')])).toEqual([]);
    expect(await access().visible(TEACHER, [view('a')])).toEqual([]);
  });
  it('an assistant answers only when every student on the lesson is hers', async () => {
    owners.ownersOf.mockResolvedValueOnce(new Map([[STUDENT_ID, ['sa-1']], ['s-2', ['sa-2']]]));
    expect(await access().mayAnswer(SALES, [STUDENT_ID, 's-2'])).toBe(false);
  });

  it("404 for an unknown id or a teacher's proposal; 403 not_your_student for another's family", async () => {
    await expect(access(null).assertRequest(ADMIN, 'p1')).rejects.toMatchObject({ status: 404 });
    const teachers = { ...FAMILY_ROW, requested_by: 'teacher' };
    await expect(access(teachers).assertRequest(ADMIN, 'p1')).rejects.toMatchObject({ status: 404 });
    await expect(access().assertRequest(OTHER_SALES, 'p1')).rejects.toMatchObject({
      response: { code: 'not_your_student' },
    });
    await expect(access().assertRequest(SALES, 'p1')).resolves.toBeUndefined();
  });
});
