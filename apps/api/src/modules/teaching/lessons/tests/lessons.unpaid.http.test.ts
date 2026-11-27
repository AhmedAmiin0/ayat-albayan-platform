import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { lessonRow, STUDENT_ID } from '@/modules/teaching/lessons/lessons.fakes';
import { lessonsApp } from '@/modules/teaching/lessons/test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const WEEK = 'from=2099-01-01T00:00:00Z&to=2099-01-08T00:00:00Z';
type Body = { id: string; students: { id: string; unpaid?: boolean }[] }[];

describe('GET /lessons: «الباقة غير مدفوعة» on upcoming lessons (R-SUB-02)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('asks UnpaidFlags about upcoming students only and marks the flagged ones', async () => {
    h.lessons.window.mockResolvedValue([
      lessonRow({ id: '00000000-0000-4000-8000-000000000e11', starts_at: '2099-01-02T14:00:00Z' }),
      lessonRow({ id: '00000000-0000-4000-8000-000000000e12', status: 'completed', starts_at: '2026-09-01T14:00:00Z' }),
    ]);
    h.unpaid.studentIds.mockResolvedValue(new Set([STUDENT_ID]));
    const res = await h.call({ method: 'GET', url: `/lessons?${WEEK}` });
    expect(h.unpaid.studentIds).toHaveBeenCalledWith([STUDENT_ID]);
    const body: Body = res.json();
    expect(body.map((l) => [l.id, l.students[0]?.unpaid])).toEqual([
      ['00000000-0000-4000-8000-000000000e11', true],
      ['00000000-0000-4000-8000-000000000e12', undefined],
    ]);
  });

  it('a failed flag lookup still returns the lessons, unflagged', async () => {
    h.lessons.window.mockResolvedValue([lessonRow({ id: '00000000-0000-4000-8000-000000000e11', starts_at: '2099-01-02T14:00:00Z' })]);
    h.unpaid.studentIds.mockRejectedValue(new Error('db down'));
    const res = await h.call({ method: 'GET', url: `/lessons?${WEEK}` });
    expect(res.statusCode).toBe(200);
    const body: Body = res.json();
    expect(body[0]?.students[0]?.unpaid).toBeUndefined();
  });
});
