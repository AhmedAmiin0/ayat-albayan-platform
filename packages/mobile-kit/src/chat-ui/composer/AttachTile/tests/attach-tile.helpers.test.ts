import { tileStyle } from '../attach-tile.helpers';

test('a tile dims while pressed and is a third of the row either way', () => {
  expect(tileStyle({ pressed: true })).toMatchObject({
    width: '33.333%',
    opacity: 0.7,
  });
  expect(tileStyle({ pressed: false }).opacity).toBe(1);
});
