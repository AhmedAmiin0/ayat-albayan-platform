import { onlineManager } from '@tanstack/react-query';
import { createConnectivity } from './connectivity-store';

// The real store with an injected probe, TanStack's real onlineManager and jest's fake clock.
jest.useFakeTimers();
const probe = jest.fn<Promise<boolean>, []>();
const setOnline = jest.fn((online: boolean) => onlineManager.setOnline(online));
const make = () => createConnectivity({ probe, setOnline });
/** Let the probe promise and its continuation settle. */
const settle = () => jest.advanceTimersByTimeAsync(0);

beforeEach(() => {
  jest.clearAllTimers(); // an earlier test's store may still have a probe scheduled
  probe.mockReset().mockResolvedValue(false);
  setOnline.mockClear();
  onlineManager.setOnline(true);
});

test('no answer → connecting and TanStack offline; an HTTP answer → online and TanStack online', () => {
  const store = make();
  store.reportFailure();
  expect(store.getState().status).toBe('connecting');
  expect(onlineManager.isOnline()).toBe(false);
  store.reportReached();
  expect(store.getState().status).toBe('online');
  expect(onlineManager.isOnline()).toBe(true);
});

test('an HTTP 500 (an answer) while online changes nothing', () => {
  const store = make();
  store.reportReached();
  expect(store.getState().status).toBe('online');
  expect(setOnline).not.toHaveBeenCalled();
});

test('probes back off 1 s, 2 s, 4 s; the first success → online, paused queries resume', async () => {
  const store = make();
  store.reportFailure();
  const at: number[] = [];
  probe.mockImplementation(async () => (at.push(Date.now()), at.length === 4));
  const start = Date.now();
  await jest.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 8000);
  expect(at.map((t) => t - start)).toEqual([1000, 3000, 7000, 15000]);
  expect(store.getState().status).toBe('online');
  expect(onlineManager.isOnline()).toBe(true);
  await jest.advanceTimersByTimeAsync(60_000);
  expect(probe).toHaveBeenCalledTimes(4); // online: the loop stopped
});

test('in the background nothing probes; back in the foreground it probes at once', async () => {
  const store = make();
  store.reportFailure();
  store.setActive(false);
  await jest.advanceTimersByTimeAsync(120_000);
  expect(probe).not.toHaveBeenCalled();
  probe.mockResolvedValue(true);
  store.setActive(true);
  await settle();
  expect(probe).toHaveBeenCalledTimes(1);
  expect(store.getState().status).toBe('online');
});

test('a probe in flight when the app leaves does not schedule another', async () => {
  const store = make();
  store.reportFailure();
  await jest.advanceTimersByTimeAsync(1000);
  store.setActive(false);
  await jest.advanceTimersByTimeAsync(120_000);
  expect(probe).toHaveBeenCalledTimes(1);
});

test('online, back after more than 30 s: one check; its failure starts connecting', async () => {
  const store = make();
  store.setActive(false);
  jest.advanceTimersByTime(31_000);
  store.setActive(true);
  await settle();
  expect(probe).toHaveBeenCalledTimes(1);
  expect(store.getState()).toMatchObject({ status: 'connecting', attempt: 0 });
});

test('online, back after a short absence: no check', async () => {
  const store = make();
  store.setActive(false);
  jest.advanceTimersByTime(5000);
  store.setActive(true);
  await settle();
  expect(probe).not.toHaveBeenCalled();
});

test('probeNow skips the rest of the backoff; listeners hear every change', async () => {
  const store = make();
  const heard = jest.fn();
  const off = store.subscribe(heard);
  store.reportFailure();
  probe.mockResolvedValue(true);
  store.probeNow();
  await settle();
  expect(store.getState().status).toBe('online');
  expect(heard).toHaveBeenCalledTimes(2);
  off();
});
