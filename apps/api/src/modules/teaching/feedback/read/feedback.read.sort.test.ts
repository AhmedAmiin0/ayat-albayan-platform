import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { listRow } from '../feedback.fakes';
import { FeedbackReadQueries } from './feedback.read.queries';

const T = 'lesson_feedback';
const PAGE = { page: 1, pageSize: 20 };
const argsOf = (calls: { table: string; method: string; args: unknown[] }[], table: string, method: string) =>
  calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);

describe('FeedbackReadQueries.page sort and column filters (R-NFR-08)', () => {
  it('teacher order: by the embedded teacher name, then newest request', async () => {
    const { db, calls } = fakeDb({ [T]: [{ data: [], count: 0 }] });
    await new FeedbackReadQueries(db).page({ filter: { sort: 'teacher', dir: 'desc' }, page: PAGE });
    expect(String(argsOf(calls, T, 'select')[0]?.[0])).toContain('teachers(display_name_ar)');
    expect(argsOf(calls, T, 'order')).toEqual([
      ['teachers(display_name_ar)', { ascending: false }],
      ['requested_at', { ascending: false }],
    ]);
  });

  it('rating order keeps unanswered rows last', async () => {
    const { db, calls } = fakeDb({ [T]: [{ data: [], count: 0 }] });
    await new FeedbackReadQueries(db).page({ filter: { sort: 'rating' }, page: PAGE });
    expect(argsOf(calls, T, 'order')[0]).toEqual(['rating', { ascending: true, nullsFirst: false }]);
  });

  it('recommend, quick rating and note filters; the note is an escaped «contains»', async () => {
    const { db, calls } = fakeDb({ [T]: [{ data: [], count: 0 }] });
    await new FeedbackReadQueries(db).page({ filter: { recommend: 'no', quick_rating: 'needs_work', note: '100%' }, page: PAGE });
    expect(argsOf(calls, T, 'eq')).toEqual([['recommend', 'no'], ['quick_rating', 'needs_work']]);
    expect(argsOf(calls, T, 'ilike')).toEqual([['note', '%100\\%%']]);
  });

  it('student: names or codes first, then their rows', async () => {
    const { db, calls } = fakeDb({ students: [{ data: [{ id: 's1' }, { id: 's2' }] }], [T]: [{ data: [listRow()], count: 1 }] });
    const res = await new FeedbackReadQueries(db).page({ filter: { student: 'سهي(لة' }, page: PAGE });
    expect(res.total).toBe(1);
    expect(argsOf(calls, 'students', 'or')).toEqual([['name.ilike.*سهي لة*,code.ilike.*سهي لة*']]);
    expect(argsOf(calls, T, 'in')).toEqual([['student_id', ['s1', 's2']]]);
  });

  it('student with no match: an empty page, no feedback read', async () => {
    const { db, calls } = fakeDb({ students: [{ data: [] }] });
    expect(await new FeedbackReadQueries(db).page({ filter: { student: 'لا أحد' }, page: PAGE })).toEqual({ rows: [], total: 0 });
    expect(calls.some((c) => c.table === T)).toBe(false);
  });
});
