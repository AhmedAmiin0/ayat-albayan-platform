import { t } from '@/core/lib/i18n/i18n';
import { nextLessonLine } from './sales-text';

test('the next lesson: weekday, day, month and the Riyadh clock (UTC+3), in 24 h or 12 h', () => {
  expect(nextLessonLine({ next_lesson_at: '2026-10-12T22:30:00.000Z' }, '24')).toBe(`${t.sales.teachers.nextLesson}: الثلاثاء 13 أكتوبر 01:30`);
  expect(nextLessonLine({ next_lesson_at: '2026-10-12T15:00:00.000Z' }, '12')).toBe(`${t.sales.teachers.nextLesson}: الاثنين 12 أكتوبر 6:00 م`);
});

test('the next lesson line, or «no lesson in the next eight days»', () => {
  expect(nextLessonLine({ next_lesson_at: '2026-10-12T15:00:00.000Z' }, '24')).toBe(`${t.sales.teachers.nextLesson}: الاثنين 12 أكتوبر 18:00`);
  expect(nextLessonLine({ next_lesson_at: null }, '24')).toBe(t.sales.teachers.noNextLesson);
});
