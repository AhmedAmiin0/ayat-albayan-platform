import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakePlanner, leadRequest, NOW, TEACHER } from '../booking.fakes';

// teachers.meeting_mode (migration 490): the booked teacher's own mode wins over the academy default
// (settings.meeting_link_auto) for the confirmation; the lessons keep the fixed link either way.

describe('BookingPlanner — per-teacher meeting mode', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('a platform teacher with the academy OFF: booking_confirmation_plain, the lesson still holds the fixed link', async () => {
    const { planner, queries } = fakePlanner();
    queries.teacher.mockResolvedValue({ ...TEACHER, meeting_mode: 'platform' });
    const { payload } = await planner.prepare(leadRequest());
    expect(payload.messages[0]?.template_key).toBe('booking_confirmation_plain');
    expect(payload.lessons[0]?.meeting_link).toBe(TEACHER.meeting_link);
  });

  it('a static teacher with the academy ON: the confirmation carries the fixed link', async () => {
    const { planner, queries } = fakePlanner({ meeting_link_auto: true });
    queries.teacher.mockResolvedValue({ ...TEACHER, meeting_mode: 'static' });
    const { payload } = await planner.prepare(leadRequest());
    expect(payload.messages[0]).toMatchObject({ template_key: 'booking_confirmation', template_params: { button: 'ab-abrar' } });
  });

  it('a teacher who follows the academy (null) gets the academy default', async () => {
    const { planner, queries } = fakePlanner({ meeting_link_auto: true });
    queries.teacher.mockResolvedValue({ ...TEACHER, meeting_mode: null });
    const { payload } = await planner.prepare(leadRequest());
    expect(payload.messages[0]?.template_key).toBe('booking_confirmation_plain');
  });
});
