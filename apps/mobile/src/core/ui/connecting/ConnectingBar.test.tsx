import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import { createConnectivity } from '@/core/lib/connectivity/connectivity-store';
import { t } from '@/core/lib/i18n/i18n';
import { ConnectingBar } from './ConnectingBar';

// The bar against a real store (probe never answers): 800 ms delay, the 260 ms reveal to the measured
// card, the 10 s hint, «تم الاتصال» for 1.5 s then the exit, a bar mounted mid-outage.
jest.useFakeTimers();
const reduceMotion = jest.mocked(AccessibilityInfo.isReduceMotionEnabled);
const timing = jest.spyOn(Animated, 'timing');
const c = t.mobile.connection;
const CARD = 52;

async function mountBar({ connectingFor }: { connectingFor?: number } = {}) {
  const store = createConnectivity({ probe: () => new Promise(() => undefined), setOnline: jest.fn() });
  if (connectingFor !== undefined) {
    store.reportFailure();
    jest.advanceTimersByTime(connectingFor);
  }
  await render(<ConnectingBar store={store} />);
  await act(async () => undefined); // Reduce Motion is read asynchronously
  return store;
}
const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));
const measure = () => fireEvent(screen.getByTestId('connecting-bar-measure'), 'layout', { nativeEvent: { layout: { height: CARD } } });
const height = () => screen.getByTestId('connecting-bar-reveal');
const heightRuns = () => timing.mock.calls.map(([, config]) => config).filter((config) => config.useNativeDriver === false);

beforeEach(() => {
  timing.mockClear();
  reduceMotion.mockResolvedValue(false);
});

test('hidden while online and for the first 800 ms; then it grows to its card over 260 ms', async () => {
  const store = await mountBar();
  expect(screen.queryByTestId('connecting-bar')).toBeNull();
  await act(async () => store.reportFailure());
  await advance(799);
  expect(screen.queryByTestId('connecting-bar')).toBeNull();
  await advance(1);
  expect(screen.getByText(c.connecting)).toBeOnTheScreen();
  expect(height()).toHaveStyle({ height: 0, overflow: 'hidden' });
  await measure();
  expect(heightRuns()).toEqual([expect.objectContaining({ toValue: CARD, duration: 260 })]);
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 260, useNativeDriver: true }));
  await advance(300);
  expect(height()).toHaveStyle({ height: CARD });
});

test('after 10 s the hint; back online «تم الاتصال» for 1.5 s, then it closes', async () => {
  const store = await mountBar();
  await act(async () => store.reportFailure());
  await advance(800);
  await measure();
  await advance(9200);
  expect(screen.getByText(c.checkInternet)).toBeOnTheScreen();
  await act(async () => store.reportReached());
  expect(screen.getByText(c.connected)).toBeOnTheScreen();
  await advance(1499);
  expect(screen.getByText(c.connected)).toBeOnTheScreen();
  await advance(1);
  expect(heightRuns().at(-1)).toEqual(expect.objectContaining({ toValue: 0, duration: 260 }));
  await advance(300);
  expect(screen.queryByTestId('connecting-bar')).toBeNull();
});

test('mounted mid-outage (a screen pushed while connecting): there at once, no slide', async () => {
  await mountBar({ connectingFor: 2000 });
  expect(screen.getByText(c.connecting)).toBeOnTheScreen();
  await measure();
  expect(heightRuns()).toEqual([]);
  expect(height()).toHaveStyle({ height: CARD });
});

test('Reduce Motion: no slide (the height jumps), a 150 ms fade, the dots still', async () => {
  reduceMotion.mockResolvedValue(true);
  const loop = jest.spyOn(Animated, 'loop');
  loop.mockClear();
  const store = await mountBar();
  await act(async () => store.reportFailure());
  await advance(800);
  await measure();
  expect(height()).toHaveStyle({ height: CARD });
  expect(heightRuns()).toEqual([]);
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 150 }));
  expect(loop).not.toHaveBeenCalled();
  await act(async () => store.reportReached());
  await advance(1500);
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0, duration: 150 }));
  await advance(200);
  expect(screen.queryByTestId('connecting-bar')).toBeNull();
});
