import { render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { ConnectingDots, STILL_DOT_OPACITY } from './ConnectingDots';

// Three 5 pt dots, 4 pt apart: a 1.2 s wave staggered 0 / 150 / 300 ms; Reduce Motion: still at 0.7.
const timing = jest.spyOn(Animated, 'timing');
const delay = jest.spyOn(Animated, 'delay');
const dots = () => screen.getAllByTestId('connecting-dot', { includeHiddenElements: true });

beforeEach(() => jest.clearAllMocks());

test('three round 5 pt dots in the given colour', async () => {
  await render(<ConnectingDots color="gold-token" still={false} />);
  expect(dots()).toHaveLength(3);
  expect(dots()[0]).toHaveStyle({ width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'gold-token' });
  expect(dots()[0]?.parent).toHaveStyle({ gap: 4 });
});

test('each dot loops every 1.2 s on the native driver, staggered 150 / 300 ms', async () => {
  await render(<ConnectingDots color="gold-token" still={false} />);
  const cycles = timing.mock.calls.map(([, config]) => config);
  expect(cycles).toHaveLength(3);
  expect(cycles.every((c) => c.duration === 1200 && c.useNativeDriver === true)).toBe(true);
  expect(delay.mock.calls.map(([ms]) => ms)).toEqual([150, 300]);
});

test('Reduce Motion: no animation, every dot at 0.7, no lift', async () => {
  await render(<ConnectingDots color="gold-token" still />);
  expect(timing).not.toHaveBeenCalled();
  expect(STILL_DOT_OPACITY).toBe(0.7);
  for (const dot of dots()) expect(dot).toHaveStyle({ opacity: 0.7, transform: [{ translateY: 0 }] });
});
