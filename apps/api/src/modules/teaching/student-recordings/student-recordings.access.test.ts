import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { StudentRecordingAccess } from './student-recordings.access';
import type { StudentRecordingRepo } from './student-recordings.repo';
import { ADMIN, ASSISTANT, GUARDIAN, OTHER_ASSISTANT, OTHER_TEACHER, SALES, STUDENT, studentQueries, TEACHER, teachersFake } from './student-recordings.fakes';

let q: ReturnType<typeof studentQueries>;
const scope = (user = ADMIN) =>
  new StudentRecordingAccess(q as unknown as StudentRecordingRepo, teachersFake() as unknown as TeachersRepo).scopeFor(user, STUDENT);

beforeEach(() => {
  q = studentQueries();
  q.assists.mockImplementation(async ({ profileId }: { profileId: string }) => profileId === ASSISTANT.id);
});

describe('who may open a student’s recordings (access matrix)', () => {
  it('admin: every lesson', async () => {
    expect(await scope(ADMIN)).toEqual({ onlyTeacherId: null, manage: 'all' });
  });

  it('the assigned teacher: every lesson of their student', async () => {
    expect(await scope(TEACHER)).toEqual({ onlyTeacherId: null, manage: { teacherId: 'teacher-1' } });
  });

  it('a teacher who only taught the student once: just their own lessons', async () => {
    q.student.mockResolvedValue({ id: STUDENT, teacher_id: 'someone-else' });
    q.taughtBy.mockResolvedValue(true);
    expect(await scope(TEACHER)).toEqual({ onlyTeacherId: 'teacher-1', manage: { teacherId: 'teacher-1' } });
    expect(q.taughtBy).toHaveBeenCalledWith({ teacherId: 'teacher-1', studentId: STUDENT });
  });

  it('another teacher (not assigned, never taught) is refused', async () => {
    await expect(scope(OTHER_TEACHER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a teacher login with no teachers row is refused', async () => {
    q.student.mockResolvedValue({ id: STUDENT, teacher_id: null });
    await expect(scope({ ...TEACHER, id: 'zzzzzzzz-0000-4000-8000-000000000001' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('an assistant assigned to the student reads; an unassigned one is refused', async () => {
    expect(await scope(ASSISTANT)).toEqual({ onlyTeacherId: null, manage: 'none' });
    expect(q.assists).toHaveBeenCalledWith({ profileId: ASSISTANT.id, studentId: STUDENT });
    await expect(scope(OTHER_ASSISTANT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a guardian and sales are refused (no portal route yet)', async () => {
    await expect(scope(GUARDIAN)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(scope(SALES)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('an unknown student is 404 before any role check', async () => {
    q.student.mockResolvedValue(null);
    await expect(scope(GUARDIAN)).rejects.toBeInstanceOf(NotFoundException);
  });
});
