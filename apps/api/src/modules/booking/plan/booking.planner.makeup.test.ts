import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, IDS, NOW } from '../booking.fakes';
import { makeupRequest, missedLessonRow } from '../makeup/booking.makeup.fakes';

const T1 = { id: 'T1', starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') };
const failure = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: e.getStatus(), body: e.getResponse() };
};

function setup(original = missedLessonRow()) {
  const deps = fakePlanner();
  deps.queries.makeupOriginal.mockResolvedValue(original);
  return deps;
}

describe('BookingPlanner — حجز تعويضي (R-SCH-10)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('one lesson, one day, no package: the rule ends the day it starts and links the missed lesson', async () => {
    const { planner } = setup();
    const { payload } = await planner.prepare(makeupRequest());
    expect(payload.rule).toMatchObject({ package: null, starts_on: '2026-10-01', ends_on: '2026-10-04' });
    expect(payload.lessons.map((l) => l.starts_at)).toEqual(['2026-10-04T14:00:00.000Z']);
    expect(payload.student_ids).toEqual([IDS.s1]);
    expect(payload.makeup_of).toBe(IDS.missed);
    expect(payload.audit.after).toMatchObject({ kind: 'makeup', package: null });
  });

  it('never touches the lead funnel and has no new-student branch', async () => {
    const { planner, queries } = setup();
    const { payload } = await planner.prepare(makeupRequest());
    expect(payload.lead).toBeNull();
    expect(payload.new_guardian).toBeNull();
    expect(payload.new_student).toBeNull();
    expect(queries.lead).not.toHaveBeenCalled();
  });

  it('the guardian\'s confirmation reads «تعويضية لـسهيلة» and reuses the approved template', async () => {
    const { planner } = setup();
    const { payload, phones } = await planner.prepare(makeupRequest());
    expect(payload.messages).toEqual([
      {
        guardian_id: IDS.g1,
        phone_e164: '+966552147730',
        template_key: 'booking_confirmation',
        template_params: { '1': 'تعويضية لـسهيلة', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-abrar' },
      },
    ]);
    expect(phones).toEqual(['+966552147730']);
  });

  it('a makeup of a non-trial package lesson only; an old kind-less body keeps its trial / package kind', async () => {
    const { planner } = setup();
    const trial = await planner.prepare(bookingRequest({ package: 'trial', studentIds: [IDS.s1] }));
    expect(trial.payload.makeup_of).toBeNull();
    expect(trial.payload.rule.package).toBe('trial');
    expect(trial.payload.messages[0]?.template_params['1']).toBe('سهيلة');
  });

  it('an excuse that counted (late cancel) is eligible; the duration and teacher are free', async () => {
    const { planner } = setup(missedLessonRow({ status: 'excused' }));
    const { payload } = await planner.prepare(makeupRequest({ durationMin: 30 }));
    expect(payload.rule.duration_min).toBe(30);
  });

  it('conflicts are checked as for any booking: 409 unless an override reason is given', async () => {
    const { planner, busy } = setup();
    busy.teacherLessons.mockResolvedValue([T1]);
    expect(await failure(planner.prepare(makeupRequest()))).toMatchObject({ status: 409, body: { code: 'conflict' } });
    const { payload, conflicts } = await planner.prepare(makeupRequest({ override: { reason: 'بطلب ولي الأمر' } }));
    expect(conflicts).toHaveLength(1);
    expect(payload.lessons[0]?.override_reason).toBe('بطلب ولي الأمر');
  });

  it('a student busy at that time clashes too', async () => {
    const { planner, busy } = setup();
    busy.studentLessons.mockResolvedValue([{ ...T1, student_id: IDS.s1 }]);
    expect(await failure(planner.prepare(makeupRequest()))).toMatchObject({ status: 409, body: { code: 'conflict' } });
  });

  it('404 lesson_not_found for a lesson that does not exist', async () => {
    const { planner, queries } = setup();
    queries.makeupOriginal.mockResolvedValue(null);
    expect(await failure(planner.prepare(makeupRequest()))).toMatchObject({ status: 404, body: { code: 'lesson_not_found' } });
  });

  it('400 makeup_student when the student was not on the missed lesson', async () => {
    const { planner } = setup(missedLessonRow({ lesson_students: [{ student_id: IDS.s2, chargeable: true }] }));
    expect(await failure(planner.prepare(makeupRequest()))).toMatchObject({ status: 400, body: { code: 'makeup_student' } });
  });

  it.each([
    ['completed', { status: 'completed' as const }, 'status'],
    ['cancelled by the teacher', { status: 'cancelled_by_teacher' as const }, 'status'],
    ['cancelled by the admin', { status: 'cancelled_by_admin' as const }, 'status'],
    ['rescheduled', { status: 'rescheduled' as const }, 'status'],
    ['a trial', { rule: { package: 'trial' as const } }, 'trial'],
    ['itself a makeup', { makeup_of_id: IDS.s3 }, 'is_makeup'],
    ['older than 60 days', { starts_at: '2026-07-01T14:00:00Z' }, 'too_old'],
    ['not charged', { lesson_students: [{ student_id: IDS.s1, chargeable: false }] }, 'not_charged'],
  ])('409 makeup_not_eligible for %s', async (_name, over, reason) => {
    const { planner } = setup(missedLessonRow(over));
    expect(await failure(planner.prepare(makeupRequest()))).toMatchObject({
      status: 409,
      body: { code: 'makeup_not_eligible', reason },
    });
  });

  it('nothing is looked up for a package or trial booking', async () => {
    const { planner, queries } = setup();
    await planner.prepare(bookingRequest());
    expect(queries.makeupOriginal).not.toHaveBeenCalled();
  });
});
