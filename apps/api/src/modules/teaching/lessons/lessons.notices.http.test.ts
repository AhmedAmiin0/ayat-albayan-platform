import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEACHER_ID } from '@/modules/teaching/scheduling/scheduling.fakes';
import { LESSON_ID } from './lessons.fakes';
import { lessonsApp } from './test-app';

// The schedule-change notices (owner 2026-10-30) through the real routes: each move or cancel
// queues the teacher's and the guardian's WhatsApp rows once the lesson is written (repo faked).

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const NEW_START = '2026-10-05T14:00:00.000Z';
const guardian = { id: 'G1', name: 'أم سهيلة', phone_e164: '+447700900001', tz: 'Europe/London', profile_id: null };
const teacher = {
  id: TEACHER_ID, profile_id: null, phone_e164: '+201000000001', tz: 'Africa/Cairo',
  display_name_ar: 'أبرار', status: 'active' as const, profile: { disabled_at: null },
};
const student = { id: 'S1', name: 'سهيلة', tz: 'Asia/Riyadh', profile_id: null, guardian };
const row = (id: string, startsAt: string) =>
  ({ id, starts_at: startsAt, teacher, lesson_students: [{ student }] });

describe('schedule-change notices on the lesson routes (owner 2026-10-30)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: new Date('2026-10-02T10:00:00Z'), toFake: ['Date'] });
    h.notices.lesson.mockImplementation(async (id: string) => row(id, NEW_START));
  });
  afterEach(() => vi.useRealTimers());

  const queued = () => h.notices.queue.mock.calls.flatMap(([rows]) => rows);

  it('POST /lessons/:id/reschedule (one): the new lesson, old → new time, both recipients', async () => {
    const body = { scope: 'one', startsAt: '2026-10-05T17:00:00+03:00' };
    expect((await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/reschedule`, body })).statusCode).toBe(200);
    const newId = String(h.writer.apply.mock.calls[0]?.[0].lessons[0].id);
    expect(h.notices.lesson).toHaveBeenCalledWith(newId);
    const rows = queued();
    expect(rows.map((r) => [r.phone_e164, r.template_key, r.lesson_id])).toEqual([
      ['+201000000001', 'lesson_rescheduled', newId],
      ['+447700900001', 'lesson_rescheduled', newId],
    ]);
    // Each in their own zone: the old time in Cairo for the teacher, the new one in London.
    expect(rows[0]?.template_params).toMatchObject({ '1': 'أبرار', '3': 'الأحد 4 أكتوبر، 5:00 م' });
    expect(rows[1]?.template_params).toMatchObject({ '1': 'أم سهيلة', '4': 'الاثنين 5 أكتوبر، 3:00 م' });
    expect(rows[0]?.dedup_key).toBe(`lesson_rescheduled:${newId}@${Date.parse(NEW_START)}:t:${TEACHER_ID}`);
  });

  it('POST /lessons/:id/reschedule (rule): ONE notice, for the new rule’s first lesson', async () => {
    const newRule = {
      teacherId: TEACHER_ID, byday: [1, 3], startTimeLocal: '18:30', tz: 'Asia/Riyadh',
      durationMin: 60, startsOn: '2026-10-12',
    };
    const body = { scope: 'rule', newRule };
    expect((await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/reschedule`, body })).statusCode).toBe(200);
    const first = h.writer.apply.mock.calls[0]?.[0].lessons[0].id;
    expect(h.notices.lesson.mock.calls).toEqual([[first]]);
    expect(queued()).toHaveLength(2);
  });

  it('POST /lessons/:id/cancel (one): lesson_cancelled to both', async () => {
    h.notices.lesson.mockResolvedValue(row(LESSON_ID, '2026-10-04T14:00:00Z'));
    const body = { scope: 'one', by: 'admin', reason: 'سفر المعلمة' };
    expect((await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/cancel`, body })).statusCode).toBe(200);
    expect(queued().map((r) => [r.template_key, r.dedup_key])).toEqual([
      ['lesson_cancelled', `lesson_cancelled:${LESSON_ID}:t:${TEACHER_ID}`],
      ['lesson_cancelled', `lesson_cancelled:${LESSON_ID}:g:G1`],
    ]);
  });

  it('PATCH /lessons/:id/time (a move): lesson_rescheduled for the same lesson', async () => {
    const body = { expectedStartsAt: '2026-10-04T14:00:00Z', startsAt: NEW_START, durationMin: 45 };
    expect((await h.call({ method: 'PATCH', url: `/lessons/${LESSON_ID}/time`, body })).statusCode).toBe(200);
    expect(queued().map((r) => [r.template_key, r.lesson_id])).toEqual([
      ['lesson_rescheduled', LESSON_ID],
      ['lesson_rescheduled', LESSON_ID],
    ]);
  });

  it('ending a series (cancel scope rule) is a course end: no lesson_cancelled notice', async () => {
    h.lessons.openOfRule.mockResolvedValue([]);
    const body = { scope: 'rule', by: 'admin', reason: 'انتهاء الاشتراك' };
    expect((await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/cancel`, body })).statusCode).toBe(200);
    expect(h.notices.lesson).not.toHaveBeenCalled();
  });

  it('template not approved: the change is saved, nothing queued', async () => {
    h.notices.approved.mockResolvedValue(false);
    const body = { scope: 'one', by: 'admin', reason: 'سفر المعلمة' };
    expect((await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/cancel`, body })).statusCode).toBe(200);
    expect(h.notices.queue).not.toHaveBeenCalled();
  });
});
