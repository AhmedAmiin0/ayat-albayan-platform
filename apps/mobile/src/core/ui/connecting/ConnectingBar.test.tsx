import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createConnectivity } from '@/core/lib/connectivity/connectivity-store';
import { t } from '@/core/lib/i18n/i18n';
import { ConnectingBar } from './ConnectingBar';

// The bar against a real store (probe never answers): 800 ms delay, 10 s hint, «تم الاتصال», Reduce Motion.
jest.useFakeTimers();
const reduceMotion = jest.mocked(AccessibilityInfo.isReduceMotionEnabled);
const loop = jest.spyOn(Animated, 'loop');
const c = t.mobile.connection;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function mountBar() {
  const store = createConnectivity({ probe: () => new Promise(() => undefined), setOnline: jest.fn() });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ConnectingBar store={store} />
    </SafeAreaProvider>,
  );
  await act(async () => undefined); // Reduce Motion is read asynchronously
  return store;
}
const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

beforeEach(() => {
  loop.mockClear();
  reduceMotion.mockResolvedValue(false);
});

test('hidden while online and for the first 800 ms of connecting', async () => {
  const store = await mountBar();
  expect(screen.queryByTestId('connecting-bar')).toBeNull();
  await act(async () => store.reportFailure());
  await advance(799);
  expect(screen.queryByTestId('connecting-bar')).toBeNull();
  await advance(1);
  expect(screen.getByText(c.connecting)).toBeOnTheScreen();
  expect(screen.queryByText(c.checkInternet)).toBeNull();
  expect(screen.getAllByTestId('connecting-dot', { includeHiddenElements: true })).toHaveLength(3);
});

test('after 10 s the hint; back online «تم الاتصال», then it slides away', async () => {
  const store = await mountBar();
  await act(async () => store.reportFailure());
  await advance(10_000);
  expect(screen.getByText(c.checkInternet)).toBeOnTheScreen();
  expect(screen.getByTestId('connecting-bar')).toHaveProp('accessibilityLiveRegion', 'polite');
  await act(async () => store.reportReached());
  expect(screen.getByText(c.connected)).toBeOnTheScreen();
  await advance(1500);
  await advance(400); // the slide away starts once «تم الاتصال» has had its time
  expect(screen.queryByTestId('connecting-bar')).toBeNull();
});

test('the dots pulse on the native driver', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const store = await mountBar();
  await act(async () => store.reportFailure());
  await advance(800);
  expect(loop).toHaveBeenCalledTimes(3);
  expect(timing.mock.calls.some(([, config]) => config.useNativeDriver === true)).toBe(true);
  timing.mockRestore();
});

test('Reduce Motion: the same three dots, still', async () => {
  reduceMotion.mockResolvedValue(true);
  const store = await mountBar();
  await act(async () => store.reportFailure());
  await advance(800);
  expect(screen.getAllByTestId('connecting-dot', { includeHiddenElements: true })).toHaveLength(3);
  expect(loop).not.toHaveBeenCalled();
});
