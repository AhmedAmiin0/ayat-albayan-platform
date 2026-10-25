import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '../../guardians/fake-db';
import { IN_CHUNK } from '../../scheduling/read-all';
import { StudentTrialQueries } from './student-trial.queries';

function setup(results: Record<string, FakeResult[]>) {
  const t = fakeDb(results);
  return { ...t, q: new StudentTrialQueries(t.db) };
}
const ruled = { rule_id: 'r1', instant: false, makeup_of_id: null };
const filters = (t: ReturnType<typeof setup>, table: string) =>
  t.calls.filter((c) => c.table === table && c.method !== 'select').map((c) => [c.method, ...c.args]);

describe('StudentTrialQueries (owner 2026-10-15)', () => {
  it('studentsOfTrialLessons: the trial lessons’ students only (platform or imported), each once', async () => {
    const lessons = [
      { id: 'L1', ...ruled, rule: { package: 'trial' }, lesson_students: [{ student_id: 's1', chargeable: true }] },
      { id: 'L2', ...ruled, rule: { package: '8' }, lesson_students: [{ student_id: 's2', chargeable: true }] },
      { id: 'L3', ...ruled, rule_id: null, rule: null, lesson_students: [{ student_id: 's3', chargeable: false }] },
    ];
    const t = setup({ lessons: [{ data: lessons }] });
    expect(await t.q.studentsOfTrialLessons(['L1', 'L2', 'L3'])).toEqual(['s1', 's3']);
    expect(t.argsOf('lessons', 'in')).toEqual(['id', ['L1', 'L2', 'L3']]);
    expect(String(t.argsOf('lessons', 'select')?.[0])).toContain('lesson_students(student_id, chargeable)');
    expect(await setup({}).q.studentsOfTrialLessons([])).toEqual([]);
  });

  it('studentsOfTrialLessons reads in chunks (never one huge in-list)', async () => {
    const ids = Array.from({ length: IN_CHUNK + 1 }, (_, i) => `L${i}`);
    const t = setup({ lessons: [{ data: [] }, { data: [] }] });
    await t.q.studentsOfTrialLessons(ids);
    expect(t.calls.filter((c) => c.method === 'in').map((c) => (c.args[1] as string[]).length)).toEqual([IN_CHUNK, 1]);
  });

  it('lessonsOf: the platform trial rows, then the imported trial rows (no rule, not instant / makeup / chargeable)', async () => {
    const platform = [{ student_id: 's1', attendance: null, chargeable: true, lesson: { status: 'scheduled', ...ruled, rule: { package: 'trial' } } }];
    const imported = [{ student_id: 's1', attendance: 'on_time', chargeable: false, lesson: { status: 'completed', ...ruled, rule_id: null, rule: null } }];
    const t = setup({ lesson_students: [{ data: platform }, { data: imported }] });
    expect(await t.q.lessonsOf(['s1'])).toEqual([...platform, ...imported]);
    expect(filters(t, 'lesson_students')).toEqual([
      ['in', 'student_id', ['s1']],
      ['eq', 'lesson.rule.package', 'trial'],
      ['in', 'student_id', ['s1']],
      ['eq', 'chargeable', false],
      ['is', 'lesson.rule_id', null],
      ['eq', 'lesson.instant', false],
      ['is', 'lesson.makeup_of_id', null],
    ]);
    expect(String(t.argsOf('lesson_students', 'select')?.[0])).toContain('!inner(package)');
    expect(await setup({}).q.lessonsOf([])).toEqual([]);
  });

  it('lessonsOf reads in chunks of students', async () => {
    const ids = Array.from({ length: IN_CHUNK * 2 }, (_, i) => `s${i}`);
    const t = setup({ lesson_students: [{ data: [] }, { data: [] }, { data: [] }, { data: [] }] });
    await t.q.lessonsOf(ids);
    expect(t.calls.filter((c) => c.method === 'in')).toHaveLength(4);
  });

  it('a db error is thrown', async () => {
    await expect(setup({ lessons: [{ error: { message: 'boom' } }] }).q.studentsOfTrialLessons(['L1'])).rejects.toThrow();
    await expect(setup({ lesson_students: [{ error: { message: 'boom' } }] }).q.lessonsOf(['s1'])).rejects.toThrow();
  });
});
