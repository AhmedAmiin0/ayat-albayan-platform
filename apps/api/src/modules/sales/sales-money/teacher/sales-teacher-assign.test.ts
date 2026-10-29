import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../../common/db/db.module';
import { SalesTeacherAssign } from './sales-teacher-assign';

const dbWith = (result: { data: unknown; error: { message: string; code: string } | null }) => {
  const rpc = vi.fn(async () => result);
  return { db: { rpc } as unknown as Db, rpc };
};

describe('SalesTeacherAssign.assign (migration 962)', () => {
  it('calls assign_student_teacher with the student, the teacher and her as the actor', async () => {
    const { db, rpc } = dbWith({ data: true, error: null });
    await expect(new SalesTeacherAssign(db).assign({ studentId: 's', teacherId: 't', actorId: 'a' })).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('assign_student_teacher', { p_student: 's', p_teacher: 't', p_actor: 'a' });
  });

  it('ensureActive: an active teacher passes; none found is 400 teacher_not_found', async () => {
    const found = (data: unknown) => {
      const q: Record<string, unknown> = {};
      Object.assign(q, { select: () => q, eq: () => q, maybeSingle: async () => ({ data, error: null }) });
      return { from: vi.fn(() => q) } as unknown as Db;
    };
    await expect(new SalesTeacherAssign(found({ id: 't' })).ensureActive('t')).resolves.toBeUndefined();
    await expect(new SalesTeacherAssign(found(null)).ensureActive('t')).rejects.toMatchObject({ response: { code: 'teacher_not_found' } });
  });

  it('an unknown or inactive teacher is 400 teacher_not_found', async () => {
    const { db } = dbWith({ data: null, error: { message: 'teacher_not_found', code: 'P0001' } });
    await expect(new SalesTeacherAssign(db).assign({ studentId: 's', teacherId: 't', actorId: 'a' })).rejects.toMatchObject({
      response: { code: 'teacher_not_found' },
    });
  });
});
