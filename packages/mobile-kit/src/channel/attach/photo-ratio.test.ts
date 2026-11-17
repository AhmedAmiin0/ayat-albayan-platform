import { photoRatio } from './photo-ratio';

test('a photo keeps its shape between 3:4 and 2:1; unknown is square', () => {
  expect(photoRatio({ width: 1600, height: 1200 })).toBeCloseTo(4 / 3);
  expect(photoRatio({ width: 1000, height: 3000 })).toBe(0.75);
  expect(photoRatio({ width: 4000, height: 1000 })).toBe(2);
  expect(photoRatio({ width: 0, height: 0 })).toBe(1);
  expect(photoRatio(undefined)).toBe(1);
});
