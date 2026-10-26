import { t } from '@/core/lib/i18n/i18n';
import { nextLessonLine, riyadhWhen } from './sales-text';

test('riyadhWhen: weekday, day, month and the Riyadh clock (UTC+3), the web words', () => {
  expect(riyadhWhen('2026-10-12T15:00:00.000Z')).toBe('الاثنين 12 أكتوبر 18:00');
  expect(riyadhWhen('2026-10-12T22:30:00.000Z')).toBe('الثلاثاء 13 أكتوبر 01:30');
});

test('the next lesson line, or «no lesson in the next eight days»', () => {
  expect(nextLessonLine({ next_lesson_at: '2026-10-12T15:00:00.000Z' })).toBe(`${t.sales.teachers.nextLesson}: الاثنين 12 أكتوبر 18:00`);
  expect(nextLessonLine({ next_lesson_at: null })).toBe(t.sales.teachers.noNextLesson);
});
