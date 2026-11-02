import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleChange } from '@/common/infra/events/lesson-events';
import { body, LESSON_ID, NOW, retimed, timeSetup } from './time-edit.fakes';

// «عدّل الوقت» and the schedule-change notices: lesson_rescheduled only when the admin left
// «notify» on AND the start moved; the family hears ONE message (lesson_rescheduled or the
// booking confirmation, FamilyMoveNotice).

function setup(usable = false) {
  const s = timeSetup();
  s.family.open = usable;
  const heard = vi.fn(async (_c: ScheduleChange) => undefined);
  s.events.onScheduleChange(heard);
  return { ...s, heard };
}

describe('«عدّل الوقت»: the move notice', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('notify:false (the admin unticked it): no notice to anyone, no confirmation', async () => {
    const s = setup(true);
    const res = await s.run(body({ notify: false }));
    expect(s.heard).not.toHaveBeenCalled();
    expect(retimed(s.writer).messages).toEqual([]);
    expect(res.notified).toBe(0);
  });

  it('a length-only edit (same start): no «previous / new time» notice', async () => {
    const s = setup(true);
    await s.run(body({ startsAt: '2026-10-04T14:00:00.000Z', durationMin: 60 }));
    expect(s.writer.retime).toHaveBeenCalledTimes(1);
    expect(s.heard).not.toHaveBeenCalled();
  });

  it('start moved, lesson_rescheduled usable: the family gets it instead of the confirmation', async () => {
    const s = setup(true);
    const res = await s.run(body());
    expect(retimed(s.writer).messages).toEqual([]);
    expect(s.heard).toHaveBeenCalledWith({
      kind: 'lesson_rescheduled',
      lessonId: LESSON_ID,
      fromStartsAt: expect.stringMatching(/^2026-10-04T14:00:00/),
      actorId: expect.any(String),
      familyNotice: true,
    });
    expect(res.notified).toBe(1);
  });

  it('start moved, template not usable: the booking confirmation (the fallback); teacher notice still', async () => {
    const s = setup(false);
    await s.run(body());
    expect(retimed(s.writer).messages.map((m) => m.template_key)).toEqual(['booking_confirmation']);
    expect(s.heard).toHaveBeenCalledWith(expect.objectContaining({ familyNotice: false }));
  });
});
