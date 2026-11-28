import { render, screen } from '@testing-library/react-native';
import { Animated, Easing } from 'react-native';
import { palette } from '../../theme';
import { ConnectingRing } from './ConnectingRing';

const timing = jest.spyOn(Animated, 'timing');
const loop = jest.spyOn(Animated, 'loop');
const hidden = { includeHiddenElements: true };
const { leatherDeep, gold } = palette.light;

beforeEach(() => jest.clearAllMocks());

test('a 220 pt ring hidden from screen readers', async () => {
  await render(<ConnectingRing track={leatherDeep} arc={gold} still={false} />);
  const ring = screen.getByTestId('connecting-ring', hidden);
  expect(ring).toHaveStyle({ position: 'absolute', width: 220, height: 220 });
  expect(ring).toHaveProp('importantForAccessibility', 'no-hide-descendants');
  expect(ring).toHaveProp('accessibilityElementsHidden', true);
});

test('turns once every 1.6 s, linearly, on the native driver', async () => {
  await render(<ConnectingRing track={leatherDeep} arc={gold} still={false} />);
  expect(loop).toHaveBeenCalledTimes(1);
  expect(timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      duration: 1600,
      easing: Easing.linear,
      toValue: 1,
      useNativeDriver: true,
    }),
  );
});

test('Reduce Motion: the ring stands still at 0 degrees', async () => {
  await render(<ConnectingRing track={leatherDeep} arc={gold} still />);
  expect(loop).not.toHaveBeenCalled();
  expect(screen.getByTestId('connecting-ring', hidden)).toHaveStyle({
    transform: [{ rotate: '0deg' }],
  });
});
