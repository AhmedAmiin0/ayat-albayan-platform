import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID, lessonRow, STUDENT_ID } from './lessons.fakes';
import { lessonsApp } from './test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const WEEK = 'from=2026-10-04T00:00:00%2B03:00&to=2026-10-11T00:00:00%2B03:00';

describe('GET /lessons, /lessons/day, /students/:id/lessons (docs/10 routes 1, 2, 5)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('week view across teachers: admin only, window [from, to) with optional teacherId', async () => {
    const res = await h.call({ method: 'GET', url: `/lessons?${WEEK}&teacherId=00000000-0000-4000-8000-0000000000b1` });
    expect(res.statusCode).toBe(200);
    expect(h.lessons.window).toHaveBeenCalledWith({
      from: new Date('2026-10-03T21:00:00Z'),
      to: new Date('2026-10-10T21:00:00Z'),
      teacherId: '00000000-0000-4000-8000-0000000000b1',
    });
    expect(res.json()[0]).toMatchObject({ id: LESSON_ID, teacher: { display_name_ar: 'أبرار', tz: 'Africa/Cairo' } });
    expect((await h.call({ method: 'GET', url: `/lessons?${WEEK}`, token: 'teacher' })).statusCode).toBe(403);
  });

  it('more than 31 days → 400 range_too_large', async () => {
    const res = await h.call({ method: 'GET', url: '/lessons?from=2026-10-01T00:00:00Z&to=2026-12-01T00:00:00Z' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ code: 'range_too_large', message: 'range_too_large' });
  });

  it('day view: the Riyadh day by default, any IANA zone', async () => {
    await h.call({ method: 'GET', url: '/lessons/day?date=2026-10-04' });
    expect(h.lessons.window).toHaveBeenLastCalledWith({ from: new Date('2026-10-03T21:00:00Z'), to: new Date('2026-10-04T21:00:00Z') });
    await h.call({ method: 'GET', url: '/lessons/day?date=2026-10-04&tz=Africa/Cairo' });
    expect(h.lessons.window).toHaveBeenLastCalledWith({ from: new Date('2026-10-03T21:00:00Z'), to: new Date('2026-10-04T21:00:00Z') });
    expect((await h.call({ method: 'GET', url: '/lessons/day?date=2026-10-04', token: 'teacher' })).statusCode).toBe(403);
  });

  it('lesson numbers are read only for completed lessons (R-LES-03)', async () => {
    h.lessons.window.mockResolvedValue([lessonRow(), lessonRow({ id: 'done', status: 'completed' })]);
    h.lessons.seq.mockResolvedValue(new Map([[`done:${STUDENT_ID}`, 12]]));
    const res = await h.call({ method: 'GET', url: `/lessons?${WEEK}` });
    expect(h.lessons.seq).toHaveBeenCalledWith(['done']);
    expect(res.json().map((l: { students: { seq: number | null }[] }) => l.students[0]?.seq)).toEqual([null, 12]);
  });

  it("a student's lessons: admin only, 404 unknown student, page envelope newest first", async () => {
    h.lessons.studentExists.mockResolvedValue(true);
    h.lessons.studentPage.mockResolvedValue({ items: [lessonRow()], total: 30, page: 2, pageSize: 10 });
    const res = await h.call({ method: 'GET', url: `/students/${STUDENT_ID}/lessons?page=2&pageSize=10` });
    expect(res.statusCode).toBe(200);
    expect(h.lessons.studentPage).toHaveBeenCalledWith(STUDENT_ID, { page: 2, pageSize: 10 });
    expect(res.json()).toMatchObject({ total: 30, page: 2, pageSize: 10, items: [{ id: LESSON_ID }] });
    h.lessons.studentExists.mockResolvedValue(false);
    expect((await h.call({ method: 'GET', url: `/students/${STUDENT_ID}/lessons` })).statusCode).toBe(404);
    expect((await h.call({ method: 'GET', url: `/students/${STUDENT_ID}/lessons`, token: 'teacher' })).statusCode).toBe(403);
  });
});
