import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleChange } from '@/common/events/lesson-events';
import type { TeachersQueries } from '@/modules/people/teachers/teachers.queries';
import { ADMIN, appliedChange, fakeStore, LESSON_ID } from '@/modules/teaching/lessons/lessons.fakes';
import type { ConflictChecker } from '@/modules/teaching/scheduling/conflicts/conflict-checker';
import { RescheduleOneService } from './reschedule-one.service';

// Moving one lesson: ONE family WhatsApp (the owner's operator, 2026-10-30), lesson_rescheduled
// when its template is usable, otherwise today's booking confirmation.

const NOW = new Date('2026-10-02T10:00:00Z');
const NEW_START = '2026-10-05T14:00:00.000Z';

function setup(usable: boolean) {
  const s = fakeStore();
  s.family.open = usable;
  const heard = vi.fn(async (_c: ScheduleChange) => undefined);
  s.events.onScheduleChange(heard);
  const checker = { check: vi.fn().mockResolvedValue([]) } as unknown as ConflictChecker;
  const service = new RescheduleOneService(s.store, {} as TeachersQueries, checker);
  const run = () => service.reschedule({ lessonId: LESSON_ID, body: { scope: 'one', startsAt: NEW_START }, actor: ADMIN });
  return { ...s, heard, run };
}

describe('RescheduleOneService: one family message per move', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('lesson_rescheduled usable: no booking confirmation queued; the notice promises the family', async () => {
    const s = setup(true);
    const id = await s.run();
    expect(appliedChange(s.writer)?.messages).toEqual([]);
    const promised = expect.objectContaining({ lessonId: id, familyNotice: true });
    expect(s.heard).toHaveBeenCalledWith(promised);
  });

  it('not usable: the booking confirmation is the one family message', async () => {
    const s = setup(false);
    await s.run();
    expect(appliedChange(s.writer)?.messages.map((m) => m.template_key)).toEqual(['booking_confirmation']);
    expect(s.heard).toHaveBeenCalledWith(expect.objectContaining({ familyNotice: false }));
  });
});
