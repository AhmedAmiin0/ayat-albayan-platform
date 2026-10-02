import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, IDS, NOW } from './booking.fakes';

describe('BookingPlanner — existing students (R-SCH-06, docs/10 §5 #14)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('builds the rule, every horizon lesson and the student ids', async () => {
    const { planner } = fakePlanner();
    const { payload, conflicts } = await planner.prepare(bookingRequest());
    expect(conflicts).toEqual([]);
    expect(payload.rule).toEqual({
      teacher_id: IDS.teacher,
      byday: [0],
      start_time_local: '17:00',
      duration_min: 45,
      tz: 'Asia/Riyadh',
      starts_on: '2026-10-01',
      ends_on: null,
      meeting_link: null,
      package: '8',
      client_request_id: null,
    });
    expect(payload.lessons.every((l) => l.meeting_link === 'https://meet.jit.si/ab-abrar')).toBe(true);
    expect(payload.student_ids).toEqual([IDS.s1, IDS.s2]);
    expect(payload.lessons.map((l) => l.starts_at)).toEqual([
      '2026-10-04T14:00:00.000Z',
      '2026-10-11T14:00:00.000Z',
      '2026-10-18T14:00:00.000Z',
      '2026-10-25T14:00:00.000Z',
      '2026-11-01T14:00:00.000Z',
    ]);
    expect(payload).toMatchObject({ lead: null, new_guardian: null, new_student: null });
  });

  it("queues one confirmation for the siblings' guardian with the teacher's Jitsi link", async () => {
    const { planner } = fakePlanner();
    const { payload } = await planner.prepare(bookingRequest());
    expect(payload.messages).toEqual([
      {
        guardian_id: IDS.g1,
        phone_e164: '+966552147730',
        template_key: 'booking_confirmation',
        template_params: { '1': 'سهيلة ومريم', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-abrar' },
      },
    ]);
  });

  it('one message per guardian when two families share the lesson', async () => {
    const { planner } = fakePlanner();
    const { payload } = await planner.prepare(bookingRequest({ studentIds: [IDS.s1, IDS.s3] }));
    expect(payload.messages.map((m) => m.guardian_id)).toEqual([IDS.g1, IDS.g2]);
  });

  it('checks the students and the teacher over the series and a week past the next DST change', async () => {
    const { planner, busy, availability, projection } = fakePlanner();
    await planner.prepare(bookingRequest());
    // Cairo (the teacher) changes on 30 Apr and 28 Oct 2027: a week after each is probed too.
    const span = { from: new Date('2026-10-04T14:00:00Z'), to: new Date('2027-10-31T14:45:00Z') };
    expect(busy.studentLessons).toHaveBeenCalledWith([IDS.s1, IDS.s2], span);
    expect(busy.teacherLessons).toHaveBeenCalledWith(IDS.teacher, span);
    expect(availability.listTimeOff).toHaveBeenCalledWith(IDS.teacher, span);
    expect(projection.busy).toHaveBeenCalledWith(expect.objectContaining({ span, excludeRuleIds: [] }));
  });

  it('keeps the idempotency key on the rule', async () => {
    const { planner } = fakePlanner();
    const clientRequestId = '77777777-7777-4777-8777-777777777777';
    const { payload } = await planner.prepare(bookingRequest({ clientRequestId }));
    expect(payload.rule.client_request_id).toBe(clientRequestId);
  });

  it('links a lead given alongside existing students', async () => {
    const { planner, queries } = fakePlanner();
    queries.lead.mockResolvedValue({ id: IDS.lead, status: 'trial_done' });
    const { payload } = await planner.prepare(bookingRequest({ leadId: IDS.lead }));
    expect(payload.lead).toEqual({ id: IDS.lead, from: 'trial_done', to: 'converted' });
  });
});

describe('BookingPlanner — not found (404)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  const status = (e: unknown) =>
    e instanceof Object && 'getStatus' in e && typeof e.getStatus === 'function' ? e.getStatus() : 0;
  const body = (e: unknown) =>
    e instanceof Object && 'getResponse' in e && typeof e.getResponse === 'function' ? e.getResponse() : {};

  it('an unknown student id', async () => {
    const { planner } = fakePlanner();
    const err = await planner.prepare(bookingRequest({ studentIds: [IDS.s1, IDS.missing] })).catch((e: unknown) => e);
    expect([status(err), body(err)]).toEqual([404, { code: 'student_not_found', message: 'student_not_found' }]);
  });

  it('an unknown teacher or lead', async () => {
    const { planner, queries } = fakePlanner();
    queries.lead.mockResolvedValue(null);
    const lead = await planner.prepare(bookingRequest({ leadId: IDS.lead })).catch((e: unknown) => e);
    expect(body(lead)).toMatchObject({ code: 'lead_not_found' });
    queries.teacher.mockResolvedValue(null);
    const teacher = await planner.prepare(bookingRequest()).catch((e: unknown) => e);
    expect([status(teacher), body(teacher)]).toMatchObject([404, { code: 'teacher_not_found' }]);
  });
});
