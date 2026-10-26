import { render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { palette } from '@/theme';
import { CheckBadge } from './CheckBadge';

// The 20 pt badge pops (0.6 → 1.12 → 1 in 320 ms) while the tick draws (24 → 0, 360 ms after 120 ms).
jest.useFakeTimers();
const timing = jest.spyOn(Animated, 'timing');
const badge = (id: string) => screen.getByTestId(id, { includeHiddenElements: true });

beforeEach(() => jest.clearAllMocks());

test('pops on the native driver and draws its white tick on the ok circle', async () => {
  await render(<CheckBadge still={false} />);
  const configs = timing.mock.calls.map(([, config]) => config);
  const pop = configs.filter((c) => c.useNativeDriver === true);
  expect(pop.map((c) => c.toValue)).toEqual([1.12, 1]);
  expect(pop.reduce((sum, c) => sum + (c.duration ?? 0), 0)).toBe(320);
  expect(configs).toContainEqual(expect.objectContaining({ toValue: 0, duration: 360, delay: 120 }));
  expect(badge('check-badge-pop')).toHaveStyle({ transform: [{ scale: 0.6 }] });
  // onLapis (#ffffff, white in both schemes), as react-native-svg hands it to the native view.
  expect(palette.light.onLapis).toBe(palette.dark.onLapis);
  expect(badge('check-badge-tick')).toHaveProp('stroke', { type: 0, payload: 0xffffffff });
  expect(badge('check-badge-tick')).toHaveProp('strokeDasharray', [11.4, 11.4]);
  expect(configs).toContainEqual(expect.objectContaining({ toValue: 0 }));
});

test('Reduce Motion: the finished badge at once, no pop', async () => {
  await render(<CheckBadge still />);
  expect(timing).not.toHaveBeenCalled();
  expect(badge('check-badge-pop')).toHaveStyle({ transform: [{ scale: 1 }] });
});
