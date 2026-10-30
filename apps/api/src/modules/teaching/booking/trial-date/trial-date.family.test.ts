import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOW } from '../booking.fakes';
import { ACTOR, fakeTrialDates, REQUEST, trialRequest, trialRow } from './trial-date.fakes';

// A trial's new date that MOVES its upcoming trial: ONE family WhatsApp (the owner's operator,
// 2026-10-30), lesson_rescheduled when its template is usable, otherwise the booking confirmation.

async function pick(usable: boolean, rows = [trialRow()]) {
  const s = fakeTrialDates({ rows });
  s.family.open = usable;
  await s.service.pick(await s.service.target(trialRequest()), ACTOR);
  const p = s.trialQueries.pick.mock.calls[0]?.[0];
  return { s, messages: p?.change?.messages ?? p?.booking?.messages };
}

describe('TrialDates: one family message per move', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('lesson_rescheduled usable: no booking confirmation; the move notice promises the family', async () => {
    const { s, messages } = await pick(true);
    expect(messages).toEqual([]);
    expect(s.events.scheduleChanged).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'lesson_rescheduled', lessonId: REQUEST, familyNotice: true }),
    );
  });

  it('not usable: the booking confirmation stays, the notice leaves the family out', async () => {
    const { s, messages } = await pick(false);
    expect(messages?.map((m) => m.template_key)).toEqual([expect.stringMatching(/^booking_confirmation/)]);
    expect(s.events.scheduleChanged).toHaveBeenCalledWith(expect.objectContaining({ familyNotice: false }));
  });

  it('no trial to move (a fresh booking): the confirmation always, no move notice', async () => {
    const past = trialRow({ status: 'completed', starts_at: '2026-09-20T14:00:00+00:00' });
    const { s, messages } = await pick(true, [past]);
    expect(messages?.length).toBe(1);
    expect(s.events.scheduleChanged).not.toHaveBeenCalled();
  });
});
