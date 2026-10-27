import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useNow } from './use-now';

const show = (state: DocumentVisibilityState) => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-26T20:59:00Z'), toFake: ['Date', 'setInterval', 'clearInterval'] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('ticks every interval', () => {
  const { result } = renderHook(() => useNow());
  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  expect(result.current.toISOString()).toBe('2026-10-26T21:00:00.000Z');
});

test('a tab shown again reads the clock at once; a hidden one does not', () => {
  const { result } = renderHook(() => useNow());
  vi.setSystemTime(new Date('2026-10-27T05:00:00Z'));
  show('hidden');
  expect(result.current.toISOString()).toBe('2026-10-26T20:59:00.000Z');
  show('visible');
  expect(result.current.toISOString()).toBe('2026-10-27T05:00:00.000Z');
});

test('unmount clears the interval and the listener', () => {
  const remove = vi.spyOn(document, 'removeEventListener');
  const { unmount } = renderHook(() => useNow());
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
});
