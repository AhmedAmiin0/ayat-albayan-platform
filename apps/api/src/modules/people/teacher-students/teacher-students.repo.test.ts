import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { TeacherStudentsRepo } from './teacher-students.repo';

describe('TeacherStudentsQueries: statuses of one kind', () => {
  it('assigned reads my students in any of the kind’s statuses (pending_renewal with active)', async () => {
    const f = fakeDb({ students: [{ data: [] }] });
    await new TeacherStudentsRepo(f.db).assigned({
      teacherId: 't1',
      statuses: ['active', 'pending_renewal'],
    });
    expect(f.calls).toContainEqual({ table: 'students', method: 'eq', args: ['teacher_id', 't1'] });
    expect(f.calls).toContainEqual({
      table: 'students',
      method: 'in',
      args: ['status', ['active', 'pending_renewal']],
    });
  });

  it('byIds filters to the statuses; no ids reads nothing', async () => {
    const f = fakeDb({ students: [{ data: [] }] });
    const q = new TeacherStudentsRepo(f.db);
    expect(await q.byIds({ ids: [], statuses: ['trial'] })).toEqual([]);
    expect(f.calls).toEqual([]);
    await q.byIds({ ids: ['s1'], statuses: ['trial'] });
    expect(f.calls).toContainEqual({
      table: 'students',
      method: 'in',
      args: ['status', ['trial']],
    });
  });
});

describe('TeacherStudentsRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.unique }] });
    expect(
      await answerOfRejection(new TeacherStudentsRepo(db).lessons({ teacherId: 't1', since: 'x' })),
    ).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(
      await answerOfRejection(new TeacherStudentsRepo(db).lessons({ teacherId: 't1', since: 'x' })),
    ).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
