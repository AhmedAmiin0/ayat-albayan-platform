import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { TeacherStudentsQueries } from './teacher-students.queries';

describe('TeacherStudentsQueries: statuses of one kind', () => {
  it('assigned reads my students in any of the kind’s statuses (pending_renewal with active)', async () => {
    const f = fakeDb({ students: [{ data: [] }] });
    await new TeacherStudentsQueries(f.db).assigned({ teacherId: 't1', statuses: ['active', 'pending_renewal'] });
    expect(f.calls).toContainEqual({ table: 'students', method: 'eq', args: ['teacher_id', 't1'] });
    expect(f.calls).toContainEqual({ table: 'students', method: 'in', args: ['status', ['active', 'pending_renewal']] });
  });

  it('byIds filters to the statuses; no ids reads nothing', async () => {
    const f = fakeDb({ students: [{ data: [] }] });
    const q = new TeacherStudentsQueries(f.db);
    expect(await q.byIds({ ids: [], statuses: ['trial'] })).toEqual([]);
    expect(f.calls).toEqual([]);
    await q.byIds({ ids: ['s1'], statuses: ['trial'] });
    expect(f.calls).toContainEqual({ table: 'students', method: 'in', args: ['status', ['trial']] });
  });
});
