import type { LessonView } from '@ab/shared';
import { shownDay } from './day-prefs';
import type { teacherDay } from './teacher-day';

type Day = ReturnType<typeof teacherDay>;
const L = (id: string) => ({ id }) as LessonView;
const DAY: Day = {
  hero: { kind: 'next', lesson: L('h'), minutes: 30 },
  rest: [L('r')],
  ended: [L('e')],
  dayEnd: null,
  noOther: false,
  next: null,
};

test('the defaults keep the day as it is', () => {
  expect(shownDay(DAY, { hero: true, ended: true })).toEqual(DAY);
});

test('hero off: its lesson leads «بقية اليوم», never «لا توجد حلقات أخرى»', () => {
  const alone: Day = { ...DAY, rest: [], ended: [], noOther: true };
  const day = shownDay(alone, { hero: false, ended: true });
  expect(day.hero).toBeNull();
  expect(day.rest.map((l) => l.id)).toEqual(['h']);
  expect(day.noOther).toBe(false);
  const none = shownDay({ ...DAY, hero: null }, { hero: false, ended: true });
  expect(none.rest.map((l) => l.id)).toEqual(['r']);
});

test('ended off: no fold', () => {
  expect(shownDay(DAY, { hero: true, ended: false }).ended).toEqual([]);
});
