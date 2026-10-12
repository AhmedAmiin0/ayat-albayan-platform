import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { tallyKinds } from './teachers.list';
import { TeachersQueries } from './teachers.queries';

describe('GET /teachers «مشترك / تجريبي» counts (R-TCH-03, owner 2026-10-12)', () => {
  it('tallyKinds counts active and trial per teacher; pending_renewal (not «مشترك»), other statuses and no teacher are ignored', () => {
    const out = tallyKinds([
      { teacher_id: 't1', status: 'active' },
      { teacher_id: 't1', status: 'trial' },
      { teacher_id: 't1', status: 'active' },
      { teacher_id: 't2', status: 'paused' },
      { teacher_id: 't1', status: 'pending_renewal' },
      { teacher_id: null, status: 'active' },
    ]);
    expect([...out]).toEqual([['t1', { active_count: 2, trial_count: 1 }]]);
  });

  it('list adds the counts of the page’s teachers, 0 for a teacher with none, from one students read', async () => {
    const f = fakeDb({
      teachers: [{ data: [{ id: 't1', display_name_ar: 'أبرار' }, { id: 't2', display_name_ar: 'بدر' }], count: 2 }],
      students: [{ data: [{ teacher_id: 't1', status: 'active' }, { teacher_id: 't1', status: 'trial' }] }],
    });
    const out = await new TeachersQueries(f.db).list({ page: 1, pageSize: 25 });
    expect(out.items.map((r) => [r.id, r.active_count, r.trial_count])).toEqual([['t1', 1, 1], ['t2', 0, 0]]);
    expect(f.argsOf('students', 'select')).toEqual(['teacher_id, status']);
    expect(f.argsOf('students', 'in')).toEqual(['teacher_id', ['t1', 't2']]);
    expect(f.calls.filter((c) => c.table === 'students' && c.method === 'in').map((c) => c.args)).toContainEqual(['status', ['trial', 'active']]);
  });

  it('an empty page reads no students', async () => {
    const f = fakeDb({ teachers: [{ data: [], count: 0 }] });
    expect((await new TeachersQueries(f.db).list({ page: 1, pageSize: 25 })).items).toEqual([]);
    expect(f.calls.some((c) => c.table === 'students')).toBe(false);
  });
});
