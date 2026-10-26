import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { StartupScreen } from './StartupScreen';

// The branded wait: when the words and the retry come, what a retry does, Reduce Motion.
jest.useFakeTimers();
const reduceMotion = jest.mocked(AccessibilityInfo.isReduceMotionEnabled);
const realLoop = Animated.loop;
const stops: jest.Mock[] = [];
/** Every loop started, with a spy on its stop. */
const loop = jest.spyOn(Animated, 'loop').mockImplementation((animation, config) => {
  const real = realLoop(animation, config);
  const stop = jest.fn(() => real.stop());
  stops.push(stop);
  return { ...real, start: (cb) => real.start(cb), stop };
});
const c = t.mobile.connection;
const onRetry = jest.fn();
const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

async function open(mode: 'quiet' | 'loading' = 'loading') {
  await render(<StartupScreen mode={mode} onRetry={onRetry} fontsLoaded />);
  await act(async () => undefined); // Reduce Motion is read asynchronously
}

beforeEach(() => {
  loop.mockClear();
  stops.length = 0;
  onRetry.mockClear();
  reduceMotion.mockResolvedValue(false);
});

test('the academy first; «جارٍ الاتصال…» after 1 s; «إعادة المحاولة» after 10 s', async () => {
  await open();
  expect(screen.getByLabelText(`${t.app.name} — ${c.loading}`)).toBeOnTheScreen();
  expect(screen.queryByText(c.connecting)).toBeNull();
  await advance(1000);
  expect(screen.getByText(c.connecting)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: c.retry })).toBeNull();
  await advance(9000);
  expect(screen.getByRole('button', { name: c.retry })).toBeOnTheScreen();
});

test('a retry asks again, keeps the words and waits another 10 s before offering it again', async () => {
  await open();
  await advance(10_000);
  await fireEvent.press(screen.getByRole('button', { name: c.retry }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: c.retry })).toBeNull();
  expect(screen.getByText(c.connecting)).toBeOnTheScreen();
  await advance(10_000);
  expect(screen.getByRole('button', { name: c.retry })).toBeOnTheScreen();
});

test('quiet (saved data coming): the mark alone until 3 s', async () => {
  await open('quiet');
  await advance(2999);
  expect(screen.queryByText(c.connecting)).toBeNull();
  await advance(1);
  expect(screen.getByText(c.connecting)).toBeOnTheScreen();
});

test('the mark breathes and the khatam turns on the native driver', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  await open();
  expect(loop).toHaveBeenCalledTimes(2);
  expect(timing.mock.calls.every(([, config]) => config.useNativeDriver === true)).toBe(true);
  timing.mockRestore();
});

test('Reduce Motion: a still emblem (stopped as soon as the setting is read), the words still come', async () => {
  reduceMotion.mockResolvedValue(true);
  await open();
  expect(screen.getByTestId('khatam-star', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(stops.every((stop) => stop.mock.calls.length > 0)).toBe(true);
  loop.mockClear();
  await advance(5000);
  expect(loop).not.toHaveBeenCalled();
  await advance(1000);
  expect(screen.getByText(c.connecting)).toBeOnTheScreen();
});
