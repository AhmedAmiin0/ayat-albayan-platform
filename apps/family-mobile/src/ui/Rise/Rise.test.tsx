import { fireEvent, render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { AppText } from '@ab/mobile-kit';
import { Rise } from './Rise';

// A card's arrival: one critically damped spring on the native driver, staggered by its place,
// started by its first layout only; Reduce Motion: shown at once, nothing moves.
const spring = jest.spyOn(Animated, 'spring').mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
}));
const layout = () =>
  fireEvent(screen.getByTestId('rise'), 'layout', { nativeEvent: { layout: { height: 120 } } });
const show = (index: number, still: boolean) =>
  render(
    <Rise index={index} still={still}>
      <AppText>سارة</AppText>
    </Rise>,
  );

beforeEach(() => jest.clearAllMocks());

test('waits for its layout, 8 dp down and clear; then one spring, never replayed', async () => {
  await show(2, false);
  expect(spring).not.toHaveBeenCalled();
  expect(screen.getByTestId('rise')).toHaveStyle({ opacity: 0, transform: [{ translateY: 8 }] });
  await layout();
  await layout(); // its reads arrive and it grows: no second arrival
  expect(spring).toHaveBeenCalledTimes(1);
  const [, config] = spring.mock.calls[0] ?? [];
  const arrive = { toValue: 1, delay: 100, mass: 1, useNativeDriver: true };
  expect(config).toEqual(expect.objectContaining(arrive));
  expect((config?.damping ?? 0) ** 2).toBeCloseTo(4 * (config?.stiffness ?? 0), 6);
});

test('the stagger stops growing after a few cards', async () => {
  await show(40, false);
  await layout();
  expect(spring.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ delay: 300 }));
});

test('Reduce Motion: no spring and no rise', async () => {
  await show(1, true);
  expect(screen.getByTestId('rise')).toHaveStyle({ transform: [{ translateY: 0 }] });
  await layout();
  expect(spring).not.toHaveBeenCalled();
  expect(screen.getByText('سارة')).toBeTruthy();
});
