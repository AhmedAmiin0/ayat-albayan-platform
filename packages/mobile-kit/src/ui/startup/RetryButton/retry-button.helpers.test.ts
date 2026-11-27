import { palette } from '../../../theme';
import { retryPressStyle } from './retry-button.helpers';

test('the retry button darkens and shrinks while pressed; at rest it is the lapis fill', () => {
  const look = retryPressStyle(palette.light);
  expect(look({ pressed: true })).toMatchObject({
    height: 48,
    backgroundColor: palette.light.lapisHover,
  });
  expect(look({ pressed: false })).toMatchObject({
    height: 48,
    backgroundColor: palette.light.lapisFill,
    transform: [{ scale: 1 }],
  });
  expect(look({ pressed: true }).transform).not.toEqual([{ scale: 1 }]);
});
