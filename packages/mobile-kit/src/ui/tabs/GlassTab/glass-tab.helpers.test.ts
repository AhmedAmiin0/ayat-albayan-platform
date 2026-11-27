import { pressStyle } from './glass-tab.helpers';

test('a pressed tab dims to 0.6 and shrinks to 0.96; at rest it is full and whole', () => {
  const look = (pressed: boolean) => pressStyle({ pressed });
  expect(look(true)).toMatchObject({ height: 54, opacity: 0.6, transform: [{ scale: 0.96 }] });
  expect(look(false)).toMatchObject({ height: 54, opacity: 1, transform: [{ scale: 1 }] });
});
