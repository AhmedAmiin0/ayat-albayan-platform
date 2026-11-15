import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWindowFocus } from './use-window-focus';

describe('useWindowFocus (W13)', () => {
  it('calls back on each window focus event, and stops after unmount', () => {
    const onFocus = vi.fn();
    const { unmount } = renderHook(() => useWindowFocus(onFocus, '+966501234567'));
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('focus'));
    expect(onFocus).toHaveBeenCalledTimes(2);
    unmount();
    window.dispatchEvent(new Event('focus'));
    expect(onFocus).toHaveBeenCalledTimes(2);
  });

  it('a visibilitychange alone does not call it (TanStack already handles that)', () => {
    const onFocus = vi.fn();
    renderHook(() => useWindowFocus(onFocus, '+966501234567'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onFocus).not.toHaveBeenCalled();
  });
});
