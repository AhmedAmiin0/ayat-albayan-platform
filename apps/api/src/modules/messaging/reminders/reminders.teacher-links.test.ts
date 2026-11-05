import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_JOIN_WINDOW } from '@ab/shared';
import type { TeacherReportLinks } from '@/modules/reporting/reports';
import { sampleLesson } from './reminders.fakes';
import { ReminderTeacherLinks } from './reminders.teacher-links';

const ORIGIN = 'https://app.example';
const ctx = { origin: ORIGIN, win: DEFAULT_JOIN_WINDOW };
const at = (now: Date) => ({ minutesBefore: 60, now, ...ctx });

function setup() {
  const links = {
    forLesson: vi.fn(async () => 'https://api.example/r/Ab12Cd34Ef'),
    classroom: vi.fn(async () => 'https://api.example/r/Zz98Yx76Wv'),
  };
  return { links, service: new ReminderTeacherLinks(links as unknown as TeacherReportLinks) };
}

describe('ReminderTeacherLinks: the short links of the teacher reminders due now', () => {
  it('only lessons whose teacher reminder is due; Meet lessons keep their link', async () => {
    const { links, service } = setup();
    const lesson = sampleLesson();
    const due = new Date(Date.parse(lesson.starts_at) - 30 * 60_000);
    const early = new Date(Date.parse(lesson.starts_at) - 5 * 3_600_000);
    expect((await service.build([lesson], at(early))).size).toBe(0);
    const map = await service.build([lesson], at(due));
    expect(map.get(lesson.id)).toEqual({ report: 'https://api.example/r/Ab12Cd34Ef' });
    expect(links.forLesson).toHaveBeenCalledWith({
      id: lesson.id,
      teacherId: lesson.teacher?.id,
      ends_at: lesson.ends_at,
    });
    expect(links.classroom).not.toHaveBeenCalled();
  });

  it('our classroom page is shortened too; a failure leaves the long links (never throws)', async () => {
    const { links, service } = setup();
    const lesson = { ...sampleLesson(), meeting_link: `${ORIGIN}/classroom/${sampleLesson().id}` };
    const now = new Date(Date.parse(lesson.starts_at) - 30 * 60_000);
    const map = await service.build([lesson], at(now));
    expect(map.get(lesson.id)).toEqual({
      report: 'https://api.example/r/Ab12Cd34Ef',
      join: 'https://api.example/r/Zz98Yx76Wv',
    });
    links.forLesson.mockRejectedValueOnce(new Error('db down'));
    expect((await service.build([lesson], at(now))).get(lesson.id)).toEqual({});
  });
});
