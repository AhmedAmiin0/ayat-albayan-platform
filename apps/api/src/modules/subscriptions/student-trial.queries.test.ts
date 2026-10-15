import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { StudentTrialQueries } from './student-trial.queries';

function setup(results: Record<string, FakeResult[]>) {
  const t = fakeDb(results);
  return { ...t, q: new StudentTrialQueries(t.db) };
}

describe('StudentTrialQueries (owner 2026-10-15)', () => {
  it('studentsOfTrialLessons: the trial lessons’ students only, each once; none asked → no query', async () => {
    const lessons = [
      { id: 'L1', rule: { package: 'trial' }, lesson_students: [{ student_id: 's1' }] },
      { id: 'L2', rule: { package: '8' }, lesson_students: [{ student_id: 's2' }] },
    ];
    const t = setup({ lessons: [{ data: lessons }] });
    expect(await t.q.studentsOfTrialLessons(['L1', 'L2'])).toEqual(['s1']);
    expect(t.argsOf('lessons', 'in')).toEqual(['id', ['L1', 'L2']]);
    expect(await setup({}).q.studentsOfTrialLessons([])).toEqual([]);
  });

  it('lessonsOf: every lesson row of the students with status and rule package', async () => {
    const rows = [{ student_id: 's1', attendance: null, lesson: { status: 'scheduled', rule: { package: 'trial' } } }];
    const t = setup({ lesson_students: [{ data: rows }] });
    expect(await t.q.lessonsOf(['s1'])).toEqual(rows);
    expect(t.argsOf('lesson_students', 'in')).toEqual(['student_id', ['s1']]);
    expect(await setup({}).q.lessonsOf([])).toEqual([]);
  });

  it('a db error is thrown', async () => {
    await expect(setup({ lessons: [{ error: { message: 'boom' } }] }).q.studentsOfTrialLessons(['L1'])).rejects.toThrow();
    await expect(setup({ lesson_students: [{ error: { message: 'boom' } }] }).q.lessonsOf(['s1'])).rejects.toThrow();
  });
});
