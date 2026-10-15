import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakePlanner, IDS, leadRequest, NOW } from './booking.fakes';

describe('BookingPlanner — lead → guardian + student + trial (R-LEAD-06)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('a new phone: the RPC creates the guardian and the student; one trial lesson', async () => {
    const { planner, queries } = fakePlanner();
    const { payload } = await planner.prepare(leadRequest());
    expect(queries.guardianByPhone).toHaveBeenCalledWith('+966501234567');
    expect(payload.student_ids).toEqual([]);
    expect(payload.new_guardian).toMatchObject({ name: 'أم ريم', phone_e164: '+966501234567', tz: 'Asia/Riyadh' });
    expect(payload.new_student).toMatchObject({ name: 'رِيم', name_normalized: 'ريم', status: 'trial', program: 'quran' });
    expect(payload.lessons.map((l) => l.starts_at)).toEqual(['2026-10-04T14:00:00.000Z']);
    expect(payload.rule).toMatchObject({ package: 'trial', ends_on: '2026-10-04' });
  });

  it('a trial booking registers the new student as trial; an explicit other status is kept (owner 2026-10-15)', async () => {
    const { planner } = fakePlanner();
    const kept = await planner.prepare(leadRequest({ newStudent: { name: 'رِيم', tz: 'Asia/Riyadh', status: 'paused' } }));
    expect(kept.payload.new_student?.status).toBe('paused');
  });

  it('moves the lead to trial_booked and links the RPC-made guardian in the message', async () => {
    const { planner } = fakePlanner();
    const { payload } = await planner.prepare(leadRequest());
    expect(payload.lead).toEqual({ id: IDS.lead, from: 'new', to: 'trial_booked' });
    expect(payload.messages).toEqual([
      {
        guardian_id: null,
        phone_e164: '+966501234567',
        template_key: 'booking_confirmation',
        template_params: { '1': 'رِيم', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-abrar' },
      },
    ]);
  });

  it('reuses the guardian that already has this phone (id and time zone)', async () => {
    const { planner, queries } = fakePlanner();
    queries.guardianByPhone.mockResolvedValue({ id: IDS.g2, tz: 'Africa/Cairo', students: [] });
    const { payload } = await planner.prepare(leadRequest({ meetingLink: 'https://meet.google.com/abc-defg-hij' }));
    expect(payload.messages[0]).toMatchObject({
      guardian_id: IDS.g2,
      template_key: 'booking_confirmation_meet',
      template_params: { button: 'abc-defg-hij' },
    });
    expect(payload.rule.meeting_link).toBe('https://meet.google.com/abc-defg-hij');
    expect(payload.lessons[0]?.meeting_link).toBe('https://meet.google.com/abc-defg-hij');
  });

  it("the new student's own link is used for a one-student booking", async () => {
    const { planner } = fakePlanner();
    const newStudent = { name: 'رِيم', tz: 'Asia/Riyadh', meeting_link_override: 'https://meet.google.com/own-link-xyz' };
    const { payload } = await planner.prepare(leadRequest({ newStudent }));
    expect(payload.lessons[0]?.meeting_link).toBe('https://meet.google.com/own-link-xyz');
    expect(payload.rule.meeting_link).toBeNull();
  });

  it('a paid package from a fresh lead books and converts it (subscribe from the chat)', async () => {
    const { planner } = fakePlanner();
    const { payload } = await planner.prepare(leadRequest({ package: '8', invoice: { source: 'upload', path: 'req/a.png' } }));
    expect(payload.lead).toEqual({ id: IDS.lead, from: 'new', to: 'converted' });
    expect(payload.new_student?.status).toBe('new');
    expect(payload.lessons).toHaveLength(5);
    expect(payload.rule.ends_on).toBeNull();
  });

  it('a brand-new student is not checked for student clashes', async () => {
    const { planner, busy } = fakePlanner();
    await planner.prepare(leadRequest());
    expect(busy.studentLessons).toHaveBeenCalledWith([], expect.anything());
  });
});
