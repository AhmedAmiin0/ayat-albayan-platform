import { describe, expect, it, vi } from 'vitest';
import type { TeacherLessonLinks } from '@/modules/teaching/lesson-links';
import { sampleLesson } from './reminders.fakes';
import { ReminderTeacherLinks } from './reminders.teacher-links';

const at = (now: Date) => ({ minutesBefore: 60, now });
const LINKS = {
  join: 'join-tok',
  report: { token: 'rep-tok', url: 'https://app.example/teacher-report/rep-tok', exp: 0 },
};

function setup() {
  const links = { forLesson: vi.fn(async () => LINKS as typeof LINKS | null) };
  return { links, service: new ReminderTeacherLinks(links as unknown as TeacherLessonLinks) };
}

describe('ReminderTeacherLinks: the signed links of the teacher reminders due now', () => {
  it('only lessons whose teacher reminder is due; signed per lesson and teacher', async () => {
    const { links, service } = setup();
    const lesson = sampleLesson();
    const due = new Date(Date.parse(lesson.starts_at) - 30 * 60_000);
    const early = new Date(Date.parse(lesson.starts_at) - 5 * 3_600_000);
    expect((await service.build([lesson], at(early))).size).toBe(0);
    expect((await service.build([lesson], at(due))).get(lesson.id)).toEqual(LINKS);
    expect(links.forLesson).toHaveBeenCalledWith({
      id: lesson.id,
      teacherId: 't-1',
      ends_at: lesson.ends_at,
    });
  });

  it('no secret, or a failure: that lesson has no links (never throws)', async () => {
    const { links, service } = setup();
    const lesson = sampleLesson();
    const now = new Date(Date.parse(lesson.starts_at) - 30 * 60_000);
    links.forLesson.mockResolvedValueOnce(null);
    expect((await service.build([lesson], at(now))).has(lesson.id)).toBe(false);
    links.forLesson.mockRejectedValueOnce(new Error('db down'));
    expect((await service.build([lesson], at(now))).has(lesson.id)).toBe(false);
  });
});
