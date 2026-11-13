import type { TeacherCourseView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay, localDay } from '@/core/lib/money/format';
import { courseLines } from './course-text';

const f = t.teacherFile;
const TZ = 'Africa/Cairo';
const course = (over: Partial<TeacherCourseView> = {}): TeacherCourseView => ({
  starts_on: '2026-10-01',
  stopped_at: null,
  ended_at: null,
  projected_end_at: null,
  lessons_total: 8,
  lessons_used: 5,
  lessons_remaining: 3,
  ...over,
});
const lessons = f.courseLessons.replace('{used}', '5').replace('{total}', '8');

test('start (a calendar date), lessons left, «الحلقات 5 من 8»', () => {
  expect(courseLines(course(), TZ)).toEqual([
    f.courseStart.replace('{date}', localDay('2026-10-01')),
    f.courseEndsAfter.few.replace('{n}', '3'),
    lessons,
  ]);
});

test('the Arabic count forms: one lesson, two lessons', () => {
  expect(courseLines(course({ lessons_remaining: 1 }), TZ)[1]).toBe(f.courseEndsAfter.one);
  expect(courseLines(course({ lessons_remaining: 2 }), TZ)[1]).toBe(f.courseEndsAfter.two);
});

test('a stop wins over an end, an end over the booked last lesson; her calendar day', () => {
  const at = '2026-10-31T22:30:00Z';
  const day = instantDay(at, TZ);
  const all = { stopped_at: at, ended_at: at, projected_end_at: at };
  expect(courseLines(course(all), TZ)[1]).toBe(f.courseStopped.replace('{date}', day));
  const ended = course({ ended_at: at, projected_end_at: at });
  expect(courseLines(ended, TZ)[1]).toBe(f.courseEnded.replace('{date}', day));
  expect(courseLines(course({ projected_end_at: at }), TZ)[1]).toBe(
    f.courseExpected.replace('{date}', day),
  );
});

test('nothing left and no known end: «لم يُعرف موعد نهاية الدورة بعد»', () => {
  expect(courseLines(course({ lessons_remaining: 0 }), TZ)[1]).toBe(f.courseEndUnknown);
});
