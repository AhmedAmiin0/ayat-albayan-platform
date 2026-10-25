import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, Animated, Dimensions, Text } from 'react-native';
import { glass, palette } from '@/theme';
import { AppNativeTabs, type TabItem } from './AppNativeTabs';

// The pill's spring and the system's Reduce Motion / Reduce Transparency switches.
const TABS: TabItem[] = [
  { name: 'a', title: 'a', icon: 'today' },
  { name: 'b', title: 'b', icon: 'inbox' },
  { name: 'c', title: 'c', icon: 'more' },
];
const stub = () => <Text>screen</Text>;
const app = { _layout: () => <AppNativeTabs tabs={TABS} />, a: stub, b: stub, c: stub };

const spring = jest.spyOn(Animated, 'spring').mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
}));
/** The pill's springs only (critically damped, clamped): where each one was sent. */
const pillMoves = () => spring.mock.calls.filter(([, c]) => c.overshootClamping === true).map(([, c]) => c);
const reduceMotion = jest.mocked(AccessibilityInfo.isReduceMotionEnabled);
const reduceTransparency = jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled);

async function open() {
  await renderRouter(app, { initialUrl: '/a' });
  await act(async () => undefined); // the accessibility settings are read asynchronously
}

afterEach(() => {
  spring.mockClear();
  reduceMotion.mockResolvedValue(false);
  reduceTransparency.mockResolvedValue(false);
});

test('no spring on mount; a tap springs the pill one tab toward the end (left in Arabic)', async () => {
  await open();
  expect(pillMoves()).toEqual([]);
  await fireEvent.press(screen.getByRole('button', { name: 'b' }));
  const tabWidth = (Dimensions.get('window').width - 40) / TABS.length;
  expect(pillMoves()).toEqual([expect.objectContaining({ toValue: -tabWidth, useNativeDriver: true, mass: 1 })]);
});

test('Reduce Motion: the pill jumps to the tab, no spring', async () => {
  reduceMotion.mockResolvedValue(true);
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'c' }));
  expect(pillMoves()).toEqual([]);
});

test('the capsule is translucent glass', async () => {
  await open();
  expect(screen.getByTestId('glass-capsule')).toHaveStyle({ backgroundColor: glass.light.fill });
});

test('Reduce Transparency: an opaque capsule', async () => {
  reduceTransparency.mockResolvedValue(true);
  await open();
  expect(screen.getByTestId('glass-capsule')).toHaveStyle({ backgroundColor: palette.light.raised });
});
