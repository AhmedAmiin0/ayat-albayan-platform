import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebounced } from './use-debounced';

afterEach(() => vi.useRealTimers());

describe('useDebounced', () => {
  it('keeps the old value until changes stop for the delay, then takes the last one', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebounced(v, 250), {
      initialProps: { v: 1 },
    });
    rerender({ v: 2 });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: 3 });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(1);
    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe(3);
  });
});
