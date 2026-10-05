import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { listRow, LESSON_ID, TEACHER_ID } from './feedback.fakes';
import { FeedbackReadQueries } from './feedback.read.queries';

const T = 'lesson_feedback';
const PAGE = { page: 3, pageSize: 10 };

describe('FeedbackReadQueries', () => {
  it('page: filters by teacher, lesson, kind and rating; `to` is inclusive (the next UTC midnight); newest first, windowed', async () => {
    const { db, calls } = fakeDb({ [T]: [{ data: [listRow()], count: 31 }] });
    const res = await new FeedbackReadQueries(db).page({
      filter: { teacher: TEACHER_ID, lesson: LESSON_ID, kind: 'trial', rating: 4, from: '2026-10-01', to: '2026-10-31' },
      page: PAGE,
    });
    expect(res).toEqual({ rows: [listRow()], total: 31 });
    const args = (m: string) => calls.filter((c) => c.method === m).map((c) => c.args);
    expect(args('eq')).toEqual([['teacher_id', TEACHER_ID], ['lesson_id', LESSON_ID], ['kind', 'trial'], ['rating', 4]]);
    expect(args('gte')).toEqual([['requested_at', '2026-10-01T00:00:00Z']]);
    expect(args('lt')).toEqual([['requested_at', '2026-11-01T00:00:00.000Z']]);
    expect(args('order')).toEqual([['requested_at', { ascending: false }]]);
    expect(args('range')).toEqual([[20, 29]]);
  });

  it('page: the select never names the link hash or the guardian', async () => {
    const { db, argsOf } = fakeDb({ [T]: [{ data: [], count: 0 }] });
    await new FeedbackReadQueries(db).page({ filter: {}, page: PAGE });
    const columns = String(argsOf(T, 'select')?.[0]);
    expect(columns).not.toContain('token_hash');
    expect(columns).not.toContain('guardian_id');
  });

  it('mine: the teacher id comes from the caller, never a filter', async () => {
    const { db, calls } = fakeDb({ [T]: [{ data: [listRow()], count: 1 }] });
    await new FeedbackReadQueries(db).mine(TEACHER_ID, { filter: { teacher: 'someone-else' }, page: { page: 1, pageSize: 25 } });
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['teacher_id', TEACHER_ID]);
  });

  it('averages: numeric strings become numbers; a row with no answers is dropped', async () => {
    const view = 'v_teacher_feedback_avg';
    const { db } = fakeDb({
      [view]: [
        {
          data: [
            { teacher_id: 't1', avg_rating: '4.50', n: 2, recommend_yes_pct: '100.0' },
            { teacher_id: 't2', avg_rating: null, n: 0, recommend_yes_pct: null },
            { teacher_id: null, avg_rating: 5, n: 1, recommend_yes_pct: 100 },
          ],
        },
      ],
    });
    expect(await new FeedbackReadQueries(db).averages()).toEqual([
      { teacher_id: 't1', avg_rating: 4.5, n: 2, recommend_yes_pct: 100 },
    ]);
  });

  it('averages(teacherId) asks for that teacher only', async () => {
    const { db, calls } = fakeDb({ v_teacher_feedback_avg: [{ data: [] }] });
    await new FeedbackReadQueries(db).averages(TEACHER_ID);
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['teacher_id', TEACHER_ID]);
  });

  it('students / teachers: no ids, no query; duplicates asked once', async () => {
    const { db, argsOf } = fakeDb({ students: [{ data: [] }] });
    const q = new FeedbackReadQueries(db);
    expect(await q.students([])).toEqual([]);
    expect(await q.teachers([])).toEqual([]);
    await q.students(['a', 'a', 'b']);
    expect(argsOf('students', 'in')).toEqual(['id', ['a', 'b']]);
  });
});
