import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { TeacherCancelRepo } from './teacher-cancel.repo';
import { TeacherConfirmRepo } from './teacher-confirm.repo';

describe('TeacherConfirmRepo', () => {
  it('calls teacher_confirm_lesson and parses its outcome', async () => {
    const f = fakeDb({ 'rpc:teacher_confirm_lesson': [{ data: 'started' }] });
    const out = await new TeacherConfirmRepo(f.db).confirm({ lessonId: 'l1', teacherId: 't1', actorId: 'p1' });
    expect(out).toBe('started');
    expect(f.argsOf('rpc:teacher_confirm_lesson', 'rpc')).toEqual([{ p_lesson: 'l1', p_teacher: 't1', p_actor: 'p1' }]);
  });

  it('an unknown answer or a database error throws', async () => {
    const odd = fakeDb({ 'rpc:teacher_confirm_lesson': [{ data: 'maybe' }] });
    await expect(new TeacherConfirmRepo(odd.db).confirm({ lessonId: 'l1', teacherId: 't1', actorId: 'p1' })).rejects.toThrow();
    const bad = fakeDb({ 'rpc:teacher_confirm_lesson': [{ data: null, error: { message: 'x', code: '42' } }] });
    await expect(new TeacherConfirmRepo(bad.db).confirm({ lessonId: 'l1', teacherId: 't1', actorId: 'p1' })).rejects.toThrow();
  });
});

describe('TeacherCancelRepo.ownerIds', () => {
  it('who brought each student and who holds their family\'s lead, once each', async () => {
    const f = fakeDb({
      students: [{ data: [{ brought_by: 'a1', guardian_id: 'g1' }, { brought_by: null, guardian_id: 'g1' }] }],
      leads: [{ data: [{ assigned_to: 'a2' }, { assigned_to: 'a1' }, { assigned_to: null }] }],
    });
    expect(await new TeacherCancelRepo(f.db).ownerIds(['s1', 's2'])).toEqual(['a1', 'a2']);
    expect(f.argsOf('students', 'in')).toEqual(['id', ['s1', 's2']]);
    expect(f.argsOf('leads', 'in')).toEqual(['converted_guardian_id', ['g1']]);
  });

  it('no students, no read', async () => {
    const f = fakeDb({});
    expect(await new TeacherCancelRepo(f.db).ownerIds([])).toEqual([]);
    expect(f.calls).toEqual([]);
  });
});
