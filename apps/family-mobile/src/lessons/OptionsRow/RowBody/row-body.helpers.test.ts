import { pressedStyle } from './row-body.helpers';

test('a pressed row dims; an idle one is opaque', () => {
  expect(pressedStyle({ pressed: true })).toEqual({ flex: 1, gap: 2, opacity: 0.7 });
  expect(pressedStyle({ pressed: false })).toEqual({ flex: 1, gap: 2, opacity: 1 });
});
