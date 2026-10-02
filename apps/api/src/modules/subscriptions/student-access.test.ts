import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import type { TeachersQueries } from '../teachers/teachers.queries';
import { StudentAccess } from './student-access';

const ADMIN: AuthUser = { id: 'a1', email: null, role: 'admin' };
const TEACHER: AuthUser = { id: 'p1', email: null, role: 'teacher' };
const GUARDIAN: AuthUser = { id: 'g1', email: null, role: 'guardian' };

function access(results: Record<string, FakeResult[]>, teacherId: string | null = 't1') {
  const { db } = fakeDb(results);
  const teachers = { idByProfile: vi.fn(async () => teacherId) };
  return new StudentAccess(db, teachers as unknown as TeachersQueries);
}
const student = (teacherId: string | null) => ({ students: [{ data: { id: 's1', teacher_id: teacherId } }] });

describe('StudentAccess (S6 guard, rule 9)', () => {
  it('admin: any existing student', async () => {
    await expect(access(student(null)).check(ADMIN, 's1')).resolves.toBeUndefined();
  });

  it('unknown student → 404 student_not_found', async () => {
    await expect(access({ students: [{ data: null }] }).check(ADMIN, 's1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('teacher: the assigned teacher', async () => {
    await expect(access(student('t1')).check(TEACHER, 's1')).resolves.toBeUndefined();
  });

  it('teacher: one who has a lesson with the student', async () => {
    const svc = access({ ...student('t2'), lesson_students: [{ count: 1 }] });
    await expect(svc.check(TEACHER, 's1')).resolves.toBeUndefined();
  });

  it('teacher: someone else’s student → 403', async () => {
    const svc = access({ ...student('t2'), lesson_students: [{ count: 0 }] });
    await expect(svc.check(TEACHER, 's1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a teacher login without a teachers row, or another role → 403', async () => {
    await expect(access(student('t1'), null).check(TEACHER, 's1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(access(student('t1')).check(GUARDIAN, 's1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
