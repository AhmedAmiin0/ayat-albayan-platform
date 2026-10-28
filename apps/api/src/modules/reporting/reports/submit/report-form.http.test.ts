import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AFTER, BEFORE, LESSON_ID, lessonRow, reportRow, STUDENT_ID, SIBLING_ID, TEACHER } from '../reports.fakes';
import { reportsApp } from '../test-app';

const URL = `/lessons/${LESSON_ID}/report-form`;
const BALANCE = {
  subscription_id: '00000000-0000-4000-8000-0000000000e9',
  lessons_total: 4,
  lessons_used: 1,
  remaining: 3,
  ended_at: null,
  projected_end_at: null,
};

describe('GET /lessons/:id/report-form (R1; R-REP-01, R-REP-04, issues A7, D1)', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: AFTER, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('identity from the lesson (read-only), drafts ensured, lesson number + package per student', async () => {
    h.lessons.lessonNumbers.mockResolvedValue(new Map([[STUDENT_ID, 2]]));
    h.lessons.packages.mockResolvedValue(new Map([[STUDENT_ID, BALANCE]]));
    const res = await h.call({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(200);
    expect(h.reports.ensureDrafts).toHaveBeenCalledWith(lessonRow(), { actorId: TEACHER.id, formVersion: 1 });
    const body = res.json();
    expect(body.lesson).toEqual({
      id: LESSON_ID,
      starts_at: '2026-10-04T14:00:00.000Z',
      ends_at: '2026-10-04T14:45:00.000Z',
      status: 'scheduled',
      meeting_link: 'https://meet.jit.si/abrar',
      teacher: { id: lessonRow().teacher_id, display_name_ar: 'أبرار', display_name_en: null, tz: 'Africa/Cairo' },
    });
    expect(body.submit_block).toBeNull();
    expect(body.entries).toEqual([
      expect.objectContaining({
        student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', tz: 'Asia/Riyadh', program: 'quran' },
        lesson_no: 2,
        package: BALANCE,
        report: expect.objectContaining({ status: 'draft', version: 0, can_edit: true }),
      }),
    ]);
  });

  it('before the start: drafts allowed, submit_block not_started', async () => {
    vi.setSystemTime(BEFORE);
    const res = await h.call({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(200);
    expect(res.json().submit_block).toBe('not_started');
  });

  it('a group lesson: one entry per student with a report, by name', async () => {
    const sibling = { student_id: SIBLING_ID, attendance: null, chargeable: true, student: { id: SIBLING_ID, code: 'AB-0184', name: 'آية', tz: 'Asia/Riyadh', program: 'quran' as const } };
    h.reports.lesson.mockResolvedValue(lessonRow({ lesson_students: [...lessonRow().lesson_students, sibling] }));
    h.reports.byLesson.mockResolvedValue([reportRow(), reportRow({ id: 'r2', student_id: SIBLING_ID })]);
    const res = await h.call({ method: 'GET', url: URL });
    expect(res.json().entries.map((e: { student: { name: string } }) => e.student.name)).toEqual(['آية', 'سهيلة']);
  });

  it('a cancelled or moved lesson → 409 lesson_cancelled, no drafts created', async () => {
    h.reports.lesson.mockResolvedValue(lessonRow({ status: 'rescheduled' }));
    const res = await h.call({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('lesson_cancelled');
    expect(h.reports.ensureDrafts).not.toHaveBeenCalled();
  });

  it('unknown lesson → 404 lesson_not_found', async () => {
    h.reports.lesson.mockResolvedValue(null);
    const res = await h.call({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('lesson_not_found');
  });

  it('another teacher → 403; a guardian → 403; the admin may open any lesson', async () => {
    expect((await h.call({ method: 'GET', url: URL, token: 'other' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: URL, token: 'guardian' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: URL, token: 'admin' })).statusCode).toBe(200);
    expect(h.reports.ensureDrafts).toHaveBeenCalledTimes(1);
  });
});
