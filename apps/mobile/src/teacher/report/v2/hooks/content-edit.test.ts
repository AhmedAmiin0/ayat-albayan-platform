import { emptyContent, type ReportContent } from '@ab/shared';
import {
  gradePart,
  gradeRate,
  gradeSkill,
  placeRange,
  toggleQuick,
  toggleTajweed,
  withIslamic,
} from './content-edit';

const range = { surah: 67, from: 1, to: 15 };

test('placeRange adds a part, then moves it keeping its grade', () => {
  const added = placeRange(emptyContent(), { kind: 'new', index: -1, range });
  expect(added.segments).toEqual([{ kind: 'new', ...range, grade: null }]);
  const graded = gradePart(added, { index: 0, grade: 'good' });
  const moved = placeRange(graded, {
    kind: 'new',
    index: 0,
    range: { surah: 67, from: 16, to: 22 },
  });
  expect(moved.segments).toEqual([{ kind: 'new', surah: 67, from: 16, to: 22, grade: 'good' }]);
  expect(gradePart(moved, { index: 5, grade: 'good' })).toBe(moved);
});

test('tajweed is one topic and clears on a second tap; quick notes toggle each', () => {
  const once = toggleTajweed(emptyContent(), 'madd');
  expect(once.tajweed).toBe('madd');
  expect(toggleTajweed(once, 'qalqala').tajweed).toBe('qalqala');
  expect(toggleTajweed(once, 'madd').tajweed).toBeNull();
  const two = toggleQuick(toggleQuick(emptyContent(), 'keep_going'), 'tajweed_focus');
  expect(two.quick).toEqual(['keep_going', 'tajweed_focus']);
  expect(toggleQuick(two, 'keep_going').quick).toEqual(['tajweed_focus']);
});

test('the Arabic and Islamic parts start empty and take one change at a time', () => {
  const arabic: ReportContent = gradeSkill(emptyContent(), {
    skill: 'reading',
    grade: 'excellent',
  });
  expect(arabic.arabic).toEqual({
    topic: null,
    skills: { reading: 'excellent', writing: null, listening: null, grammar: null },
  });
  const islamic = gradeRate(withIslamic(emptyContent(), { domain: 'fiqh', topic: 'الوضوء' }), {
    rate: 'participation',
    grade: 'good',
  });
  expect(islamic.islamic).toEqual({
    domain: 'fiqh',
    topic: 'الوضوء',
    memorized: null,
    rates: { comprehension: null, participation: 'good' },
  });
});
