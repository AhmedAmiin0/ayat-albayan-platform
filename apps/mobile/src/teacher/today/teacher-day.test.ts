import { lesson } from '@/today/testing/fixtures';
import { teacherDay, type DayInput } from './teacher-day';

// 1 Oct 2026, 17:00 Cairo (14:00Z).
const now = new Date('2026-10-01T14:00:00Z');
/** A lesson from its id and its UTC start and end on «YYYY-MM-DDTHH:MM». */
const at = (id: string, [start, end]: [string, string]) =>
  lesson({ id, starts_at: `${start}:00.000Z`, ends_at: `${end}:00.000Z` });
const done = at('done', ['2026-10-01T10:00', '2026-10-01T10:45']);
const running = at('run', ['2026-10-01T13:30', '2026-10-01T14:15']);
const later = at('later', ['2026-10-01T17:00', '2026-10-01T17:45']);
const cancelled = {
  ...at('c', ['2026-10-01T16:00', '2026-10-01T16:45']),
  status: 'cancelled_by_teacher' as const,
};
const sunday = at('sun', ['2026-10-04T13:00', '2026-10-04T13:45']);

const input = (lessons: DayInput['lessons']): DayInput => ({
  lessons,
  pending: [],
  date: '2026-10-01',
  tz: 'Africa/Cairo',
  now,
});

test('the running lesson leads; the rest drops it and closed lessons; ended ones fold', () => {
  const day = teacherDay(input([later, cancelled, running, done, sunday]));
  expect(day.hero?.lesson.id).toBe('run');
  expect(day.rest.map((l) => l.id)).toEqual(['later']);
  expect(day.ended.map((l) => l.id)).toEqual(['done']);
  expect(day.dayEnd).toBeNull();
  expect(day.next).toBeNull();
});

test('a due report shows once: the ended lesson in the block, the hero’s never', () => {
  const day = teacherDay(input([running, done]));
  expect(day.due.map((d) => d.lessonId)).toEqual(['done']);
});

test('no lessons today: «empty» and the next lesson ahead within the window', () => {
  const day = teacherDay(input([sunday]));
  expect(day.dayEnd).toBe('empty');
  expect(day.next?.id).toBe('sun');
});

test('everything ended: «done»; only the hero left with nothing ended: noOther', () => {
  expect(teacherDay(input([done])).dayEnd).toBe('done');
  expect(teacherDay(input([done])).next).toBeNull();
  const onlyHero = teacherDay(input([later]));
  expect(onlyHero.noOther).toBe(true);
  expect(onlyHero.dayEnd).toBeNull();
  expect(teacherDay(input(undefined)).dayEnd).toBeNull();
});
