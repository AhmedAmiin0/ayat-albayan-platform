import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakePlanner, leadRequest, NOW, TEACHER } from '../booking.fakes';

// settings.meeting_link_auto (owner 2026-10-12): the booking confirmation follows the mode; the
// lesson rows always keep the resolved fixed link (turning the switch off brings it straight back).

describe('BookingPlanner — meeting link mode', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('static (the default): the confirmation carries the teacher\'s Jitsi room', async () => {
    const { payload } = await fakePlanner().planner.prepare(leadRequest());
    expect(payload.messages[0]).toMatchObject({ template_key: 'booking_confirmation', template_params: { button: 'ab-abrar' } });
    expect(payload.lessons[0]?.meeting_link).toBe(TEACHER.meeting_link);
  });

  it('auto: booking_confirmation_plain with no button, while the lesson still holds the fixed link', async () => {
    const { planner } = fakePlanner({ meeting_link_auto: true });
    const { payload, invoiceMaxBytes } = await planner.prepare(leadRequest());
    expect(payload.messages).toEqual([
      {
        guardian_id: null,
        phone_e164: '+966501234567',
        template_key: 'booking_confirmation_plain',
        template_params: { '1': 'رِيم', '2': 'الأحد 4 أكتوبر 17:00' },
      },
    ]);
    expect(payload.lessons[0]?.meeting_link).toBe(TEACHER.meeting_link);
    expect(payload.rule.meeting_link).toBeNull();
    expect(invoiceMaxBytes).toBe(10 * 1024 * 1024);
  });

  it('auto: an explicit Meet link of the booking is kept on the lessons, not sent', async () => {
    const link = 'https://meet.google.com/abc-defg-hij';
    const { payload } = await fakePlanner({ meeting_link_auto: true }).planner.prepare(leadRequest({ meetingLink: link }));
    expect(payload.messages[0]?.template_key).toBe('booking_confirmation_plain');
    expect(payload.lessons[0]?.meeting_link).toBe(link);
    expect(payload.rule.meeting_link).toBe(link);
  });
});
