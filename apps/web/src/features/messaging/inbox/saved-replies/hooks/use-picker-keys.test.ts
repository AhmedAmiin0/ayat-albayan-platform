import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { usePickerKeys } from './use-picker-keys';

function key(name: string, shiftKey = false) {
  const preventDefault = vi.fn();
  return { event: { key: name, shiftKey, preventDefault } as unknown as KeyboardEvent<HTMLElement>, preventDefault };
}

function setup(count: number) {
  const onPick = vi.fn();
  const onClose = vi.fn();
  const hook = renderHook(() => usePickerKeys({ count, onPick, onClose }));
  return { hook, onPick, onClose };
}

describe('usePickerKeys', () => {
  it('Enter picks the highlighted row; ↓ ↑ wrap', () => {
    const { hook, onPick } = setup(3);
    act(() => void hook.result.current.onKey(key('ArrowUp').event));
    expect(hook.result.current.active).toBe(2);
    act(() => void hook.result.current.onKey(key('ArrowDown').event));
    expect(hook.result.current.active).toBe(0);
    const enter = key('Enter');
    expect(hook.result.current.onKey(enter.event)).toBe(true);
    expect(onPick).toHaveBeenCalledWith(0);
    expect(enter.preventDefault).toHaveBeenCalled();
  });

  it('Enter on an empty list (no match, loading) is taken and picks nothing', () => {
    const { hook, onPick } = setup(0);
    const enter = key('Enter');
    expect(hook.result.current.onKey(enter.event)).toBe(true);
    expect(enter.preventDefault).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('Shift+Enter and other keys pass through; Esc closes', () => {
    const { hook, onClose } = setup(2);
    const shift = key('Enter', true);
    expect(hook.result.current.onKey(shift.event)).toBe(false);
    expect(shift.preventDefault).not.toHaveBeenCalled();
    expect(hook.result.current.onKey(key('a').event)).toBe(false);
    expect(hook.result.current.onKey(key('Escape').event)).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });
});
