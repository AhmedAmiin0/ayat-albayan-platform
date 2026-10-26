import { CLOSE_AT, dragClaims, dragCloses, dragOffset } from './sheet-drag';

test('only a downward drag moves the sheet', () => {
  expect(dragClaims(20, 2)).toBe(true);
  expect(dragClaims(-20, 2)).toBe(false);
  expect(dragClaims(20, 30)).toBe(false);
  expect(dragClaims(4, 0)).toBe(false);
  expect(dragOffset(-30)).toBe(0);
  expect(dragOffset(30)).toBe(30);
});

test('far enough or a quick flick closes it; a short slow drag springs back', () => {
  expect(dragCloses(CLOSE_AT, 0)).toBe(true);
  expect(dragCloses(30, 1.2)).toBe(true);
  expect(dragCloses(30, 0.2)).toBe(false);
});
