import { swipeCloses } from './use-swipe-close';

test('a long or fast swipe down closes the sheet; a short slow one springs back', () => {
  expect(swipeCloses({ dy: 80, vy: 0.1 })).toBe(true);
  expect(swipeCloses({ dy: 20, vy: 1.2 })).toBe(true);
  expect(swipeCloses({ dy: 30, vy: 0.2 })).toBe(false);
  expect(swipeCloses({ dy: -90, vy: -1 })).toBe(false);
});
