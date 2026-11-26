import { rec } from '@/recordings/recordings.fixtures';
import { firstPerLesson } from './recordings-list.helpers';

test('one row per lesson: the first part of each, in order', () => {
  const rows = [rec('A', 'L1'), rec('B', 'L1'), rec('C', 'L2'), rec('D', 'L2')];
  expect(firstPerLesson(rows).map((r) => r.id)).toEqual(['A', 'C']);
});

test('no recordings: none', () => {
  expect(firstPerLesson([])).toEqual([]);
});
