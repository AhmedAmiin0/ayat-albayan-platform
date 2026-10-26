import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID, lessonRow, TEACHER_ID } from '../lessons.fakes';
import { lessonsApp } from '../test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const DAY = 'from=2026-10-04T00:00:00%2B03:00&to=2026-10-05T00:00:00%2B03:00';
const WINDOW = { from: new Date('2026-10-03T21:00:00Z'), to: new Date('2026-10-04T21:00:00Z') };
const ABRAR = {
  ...{ id: TEACHER_ID, display_name_ar: 'أبرار', display_name_en: null, gender: 'female', programs: ['quran'], tz: 'Africa/Cairo' },
  ...{ meeting_link: 'https://meet.jit.si/abrar', max_students: 12, status: 'active' },
};

describe('GET /lessons/overview (R-SCH-09 all-teachers calendar)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    h.overview.teachers.mockResolvedValue([ABRAR]);
    h.overview.slots.mockResolvedValue([{ teacher_id: TEACHER_ID, weekday: 0, start_time: '16:00:00', end_time: '18:00:00', tz: 'Africa/Cairo' }]);
    h.teachers.loads.mockResolvedValue(new Map([[TEACHER_ID, 7]]));
    h.lessons.window.mockResolvedValue([lessonRow({ rule: { byday: [0], package: 'trial' } })]);
  });

  it('one payload: teachers with load, windows and free time, plus the lessons (trial tagged)', async () => {
    const res = await h.call({ method: 'GET', url: `/lessons/overview?${DAY}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.teachers).toEqual([
      {
        ...ABRAR,
        students_count: 7,
        windows: [{ starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T15:00:00.000Z' }],
        time_off: [],
        free: [{ starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T14:00:00.000Z' }],
      },
    ]);
    expect(body.lessons).toMatchObject([{ id: LESSON_ID, trial: true }]);
    expect(body.from).toBe('2026-10-03T21:00:00.000Z');
  });

  it('six reads for the window, no per-teacher calls; teacherId narrows every read', async () => {
    await h.call({ method: 'GET', url: `/lessons/overview?${DAY}` });
    for (const read of [h.overview.teachers, h.overview.slots, h.overview.timeOff, h.overview.carryOver, h.lessons.window]) {
      expect(read).toHaveBeenCalledTimes(1);
      expect(read).toHaveBeenCalledWith({ ...WINDOW, teacherId: undefined });
    }
    expect(h.teachers.loads).toHaveBeenCalledWith(undefined);
    await h.call({ method: 'GET', url: `/lessons/overview?${DAY}&teacherId=${TEACHER_ID}` });
    expect(h.overview.timeOff).toHaveBeenLastCalledWith({ ...WINDOW, teacherId: TEACHER_ID });
    expect(h.teachers.loads).toHaveBeenLastCalledWith([TEACHER_ID]);
  });

  it('admin only: a teacher or guardian gets 403', async () => {
    expect((await h.call({ method: 'GET', url: `/lessons/overview?${DAY}`, token: 'teacher' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: `/lessons/overview?${DAY}`, token: 'guardian' })).statusCode).toBe(403);
  });

  it('32 days → 400 range_too_large; to before from → 400', async () => {
    const long = await h.call({ method: 'GET', url: '/lessons/overview?from=2026-10-01T00:00:00Z&to=2026-11-02T00:00:00Z' });
    expect([long.statusCode, long.json().code]).toEqual([400, 'range_too_large']);
    const back = await h.call({ method: 'GET', url: '/lessons/overview?from=2026-10-05T00:00:00Z&to=2026-10-04T00:00:00Z' });
    expect(back.statusCode).toBe(400);
  });
});
