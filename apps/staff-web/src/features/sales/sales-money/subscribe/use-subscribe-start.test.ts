import { usedBeforeMax } from '@ab/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSubscribeStart } from './use-subscribe-start';

const can = vi.hoisted(() => vi.fn<(p: string) => boolean>());
vi.mock('@ab/web-kit/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can }),
}));

describe('useSubscribeStart', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // 22:30 UTC is already the next day in Riyadh (UTC+3).
    vi.setSystemTime(new Date('2026-11-09T22:30:00.000Z'));
    can.mockReturnValue(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    can.mockReset();
  });

  it('starts on the academy day, not started, nothing used', () => {
    const { result } = renderHook(() => useSubscribeStart(8));
    expect(result.current.today).toBe('2026-11-10');
    expect(result.current.shown).toEqual({
      startsOn: '2026-11-10',
      alreadyStarted: false,
      usedBefore: 0,
    });
    expect(result.current.error).toBeNull();
  });

  it('reads the set_start_date permission', () => {
    can.mockImplementation((p) => p === 'subscriptions.set_start_date');
    const { result } = renderHook(() => useSubscribeStart(8));
    expect(result.current.canSet).toBe(true);
  });

  it('merges a patch and clamps the lessons used to the package', () => {
    const { result, rerender } = renderHook(({ n }) => useSubscribeStart(n), {
      initialProps: { n: 8 },
    });
    act(() => {
      result.current.patch({ alreadyStarted: true, usedBefore: 6 });
    });
    expect(result.current.shown).toMatchObject({ alreadyStarted: true, usedBefore: 6 });
    rerender({ n: 4 });
    expect(result.current.usedMax).toBe(usedBeforeMax(4));
    expect(result.current.shown.usedBefore).toBe(usedBeforeMax(4));
  });

  it('keeps the error the submit sets', () => {
    const { result } = renderHook(() => useSubscribeStart(8));
    act(() => {
      result.current.setError('x');
    });
    expect(result.current.error).toBe('x');
  });
});
