import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import type { Db } from '@/common/db/db.module';
import { ProfileCourseRepo } from './profile-course.repo';

// «تغيير المعلم»'s reads and the students.teacher_id compare-and-set (owner 2026-10-30).
function chain(result: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const k of ['select', 'eq', 'is', 'in', 'gte', 'order', 'limit', 'update'])
    q[k] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  return Object.assign(q, {
    then: (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok),
  });
}
const setup = (result: unknown) => {
  const q = chain(result);
  const audit = { record: vi.fn() };
  return {
    q,
    audit,
    repo: new ProfileCourseRepo(
      { from: vi.fn(() => q) } as unknown as Db,
      audit as unknown as AuditService,
    ),
  };
};
const ASSIGN = { studentId: 'st1', from: 't1', to: 't2', actorId: 'a1', subscriptionId: 's1' };

describe('ProfileCourseRepo', () => {
  it('studentTeacher: the assigned teacher; 404 student_not_found', async () => {
    expect(
      await setup({ data: { teacher_id: 't1' }, error: null }).repo.studentTeacher('st1'),
    ).toBe('t1');
    await expect(setup({ data: null, error: null }).repo.studentTeacher('st1')).rejects.toThrow(
      'student_not_found',
    );
  });

  it("upcoming: the course's next open lesson", async () => {
    const { q, repo } = setup({
      data: [{ status: 'scheduled', starts_at: '2026-11-01T15:00:00Z', rule: {} }],
      error: null,
    });
    expect(await repo.upcoming('s1')).toEqual([
      { status: 'scheduled', starts_at: '2026-11-01T15:00:00Z' },
    ]);
    expect(q.eq).toHaveBeenCalledWith('rule.subscription_id', 's1');
    expect(q.limit).toHaveBeenCalledWith(1);
  });

  it('assignTeacher: compare-and-set on the old teacher, audited teacher_change', async () => {
    const { q, audit, repo } = setup({ data: { id: 'st1' }, error: null });
    expect(await repo.assignTeacher(ASSIGN)).toBe(true);
    expect(q.update).toHaveBeenCalledWith({ teacher_id: 't2' });
    expect(q.eq).toHaveBeenCalledWith('teacher_id', 't1');
    expect(audit.record).toHaveBeenCalledWith({
      actorId: 'a1',
      entity: 'students',
      entityId: 'st1',
      action: 'teacher_change',
      before: { teacher_id: 't1' },
      after: { teacher_id: 't2', subscription_id: 's1' },
    });
  });

  it('assignTeacher: no teacher before → is null; a miss writes no audit', async () => {
    const { q, audit, repo } = setup({ data: null, error: null });
    expect(await repo.assignTeacher({ ...ASSIGN, from: null })).toBe(false);
    expect(q.is).toHaveBeenCalledWith('teacher_id', null);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
