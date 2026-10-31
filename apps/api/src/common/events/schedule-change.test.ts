import { describe, expect, it, vi } from 'vitest';
import { LessonEvents, type ScheduleChange } from './lesson-events';

const MOVED: ScheduleChange = {
  kind: 'lesson_rescheduled',
  lessonId: 'L2',
  fromStartsAt: 'x',
  actorId: 'p1',
};

describe('LessonEvents.scheduleChanged (the schedule-change notices, owner 2026-10-30)', () => {
  it('hands the change to every listener, in order', async () => {
    const events = new LessonEvents();
    const seen: string[] = [];
    events.onScheduleChange(async (c) => void seen.push(`a:${c.kind}`));
    events.onScheduleChange(async (c) => void seen.push(`b:${c.kind}`));
    await events.scheduleChanged(MOVED);
    expect(seen).toEqual(['a:lesson_rescheduled', 'b:lesson_rescheduled']);
  });

  it('a failing listener never fails the committed change; the next still runs', async () => {
    const events = new LessonEvents();
    const after = vi.fn().mockResolvedValue(undefined);
    events.onScheduleChange(() => Promise.reject(new Error('down')));
    events.onScheduleChange(after);
    await expect(events.scheduleChanged(MOVED)).resolves.toBeUndefined();
    expect(after).toHaveBeenCalledWith(MOVED);
  });

  it('the balance listeners do not hear schedule changes', async () => {
    const events = new LessonEvents();
    const balance = vi.fn();
    events.onChanged(balance);
    await events.scheduleChanged(MOVED);
    expect(balance).not.toHaveBeenCalled();
  });
});
