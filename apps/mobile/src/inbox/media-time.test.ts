import { mediaProgress, mediaTime } from './media-time';

test('mediaTime: m:ss, seconds padded, nothing before the duration is known', () => {
  expect(mediaTime(0)).toBe('0:00');
  expect(mediaTime(7.9)).toBe('0:07');
  expect(mediaTime(65)).toBe('1:05');
  expect(mediaTime(600)).toBe('10:00');
  expect(mediaTime(Number.NaN)).toBe('0:00');
  expect(mediaTime(-3)).toBe('0:00');
});

test('mediaProgress: a share of the duration, clamped, 0 while unknown', () => {
  expect(mediaProgress(5, 20)).toBe(0.25);
  expect(mediaProgress(25, 20)).toBe(1);
  expect(mediaProgress(3, 0)).toBe(0);
  expect(mediaProgress(Number.NaN, 10)).toBe(0);
});
