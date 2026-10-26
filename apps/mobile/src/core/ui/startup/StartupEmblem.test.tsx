import { render, screen } from '@testing-library/react-native';
import { Animated, Easing, useColorScheme } from 'react-native';
import { palette } from '@/theme';
import { emblemColors, StartupEmblem } from './StartupEmblem';

// The 220 pt emblem: glow disc, track + gold arc, the 112 × 120 mark; its loops; light and dark tokens.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn(() => 'light') }));
const scheme = jest.mocked(useColorScheme);
const timing = jest.spyOn(Animated, 'timing');
const loop = jest.spyOn(Animated, 'loop');
const hidden = { includeHiddenElements: true };

beforeEach(() => jest.clearAllMocks());

test('light: a white disc and a mint track; dark: the lifted green for both; the arc gold', () => {
  const { light, dark } = palette;
  expect(emblemColors('light', light)).toEqual({ glow: light.page, track: light.leatherDeep, arc: light.gold });
  expect(emblemColors('dark', dark)).toEqual({ glow: dark.leatherLift, track: dark.leatherLift, arc: dark.gold });
});

test('sizes: the Ø168 disc, the 220 ring (r 104, 3 pt, dash 120 533, round caps), the 112 × 120 mark', async () => {
  scheme.mockReturnValue('dark');
  await render(<StartupEmblem still={false} />);
  expect(screen.getByTestId('startup-glow', hidden)).toHaveStyle({ width: 168, height: 168, borderRadius: 84, backgroundColor: palette.dark.leatherLift });
  expect(screen.getByTestId('connecting-ring', hidden)).toHaveStyle({ width: 220, height: 220 });
  expect(screen.getByTestId('startup-mark', hidden)).toHaveStyle({ width: 112, height: 120 });
  expect(screen.getByTestId('startup-mark', hidden)).toHaveProp('resizeMode', 'contain');
  scheme.mockReturnValue('light');
});

test('the ring turns every 1.6 s linearly; glow and mark breathe in one 2.4 s ease-in-out loop', async () => {
  await render(<StartupEmblem still={false} />);
  expect(loop).toHaveBeenCalledTimes(2);
  const configs = timing.mock.calls.map(([, config]) => config);
  expect(configs.every((c) => c.useNativeDriver === true)).toBe(true);
  expect(configs).toContainEqual(expect.objectContaining({ duration: 1600, easing: Easing.linear, toValue: 1 }));
  const breath = configs.filter((c) => c.duration === 1200);
  expect(breath.map((c) => c.toValue)).toEqual([1, 0]);
  expect(screen.getByTestId('startup-glow', hidden)).toHaveStyle({ opacity: 0.35, transform: [{ scale: 0.96 }] });
});

test('Reduce Motion: nothing loops; the disc and the mark rest on the first frame', async () => {
  await render(<StartupEmblem still />);
  expect(loop).not.toHaveBeenCalled();
  expect(screen.getByTestId('startup-glow', hidden)).toHaveStyle({ opacity: 0.35, transform: [{ scale: 0.96 }] });
  expect(screen.getByTestId('connecting-ring', hidden)).toHaveStyle({ transform: [{ rotate: '0deg' }] });
});
