import { elapsedText } from './use-elapsed';

test('minutes and seconds, then hours', () => {
  expect(elapsedText(252)).toBe('04:12');
  expect(elapsedText(0)).toBe('00:00');
  expect(elapsedText(3852.7)).toBe('1:04:12');
  expect(elapsedText(-3)).toBe('00:00');
});
