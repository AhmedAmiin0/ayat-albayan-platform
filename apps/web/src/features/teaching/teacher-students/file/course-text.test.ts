import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { courseLines } from './course-text';
import { COURSE } from './file-fixture';

const TZ = 'Africa/Cairo';
const f = t.teacherFile;

describe('courseLines (docs/47 owner call 1)', () => {
  it('start as a calendar date (no zone shift) and the lessons used', () => {
    const lines = courseLines(COURSE, 'Pacific/Honolulu');
    expect(lines.start).toBe(f.courseStart.replace('{date}', '1 سبتمبر 2026'));
    expect(lines.lessons).toBe(f.courseLessons.replace('{used}', '5').replace('{total}', '8'));
  });

  it.each([
    ['stopped', { stopped_at: '2026-10-01T22:30:00.000Z' }, f.courseStopped.replace('{date}', '2 أكتوبر 2026')],
    ['ended', { ended_at: '2026-10-04T10:00:00.000Z', lessons_remaining: 0 }, f.courseEnded.replace('{date}', '4 أكتوبر 2026')],
    ['expected', { projected_end_at: '2026-10-20T13:00:00.000Z' }, f.courseExpected.replace('{date}', '20 أكتوبر 2026')],
    ['after n', {}, 'تنتهي الدورة بعد 3 حلقات'],
    ['after one', { lessons_remaining: 1 }, 'تنتهي الدورة بعد حلقة واحدة'],
    ['unknown', { lessons_remaining: 0 }, f.courseEndUnknown],
  ])('the end line: %s', (_case, over, text) => {
    expect(courseLines({ ...COURSE, ...over }, TZ).end).toBe(text);
  });

  it('a stop wins over an end, an end over a booked last lesson', () => {
    const all = {
      ...COURSE,
      stopped_at: '2026-10-01T10:00:00.000Z',
      ended_at: '2026-10-04T10:00:00.000Z',
      projected_end_at: '2026-10-20T13:00:00.000Z',
    };
    expect(courseLines(all, TZ).end).toBe(f.courseStopped.replace('{date}', '1 أكتوبر 2026'));
    const ended = { ...all, stopped_at: null };
    expect(courseLines(ended, TZ).end).toBe(f.courseEnded.replace('{date}', '4 أكتوبر 2026'));
  });
});
