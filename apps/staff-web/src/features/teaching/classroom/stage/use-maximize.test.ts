import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { maximizeModeOf, useMaximize } from './use-maximize';

const setFullscreenEnabled = (on: boolean) => Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: on });
const setFullscreenElement = (el: Element | null) => Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: el });

describe('maximizeModeOf', () => {
  it('fullscreen where the element has requestFullscreen and the document allows it, else the overlay', () => {
    const el = { requestFullscreen: () => Promise.resolve() };
    expect(maximizeModeOf(el, { fullscreenEnabled: true })).toBe('fullscreen');
    expect(maximizeModeOf(el, { fullscreenEnabled: false })).toBe('overlay');
    expect(maximizeModeOf({}, { fullscreenEnabled: true })).toBe('overlay'); // iOS Safari on a <div>
    expect(maximizeModeOf(null, { fullscreenEnabled: true })).toBe('overlay');
  });
});

describe('useMaximize', () => {
  afterEach(() => {
    setFullscreenEnabled(false);
    setFullscreenElement(null);
  });

  it('overlay fallback: toggles on, Esc and toggle leave it', () => {
    setFullscreenEnabled(false);
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useMaximize(ref));
    act(() => result.current.toggle());
    expect([result.current.maximized, result.current.mode]).toEqual([true, 'overlay']);
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(result.current.maximized).toBe(false);
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.maximized).toBe(false);
  });

  it('fullscreen: asks the element, ends when the browser leaves fullscreen', () => {
    setFullscreenEnabled(true);
    const el = document.createElement('div');
    el.requestFullscreen = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useMaximize({ current: el }));
    act(() => result.current.toggle());
    expect(el.requestFullscreen).toHaveBeenCalled();
    expect(result.current.mode).toBe('fullscreen');
    act(() => void document.dispatchEvent(new Event('fullscreenchange')));
    expect(result.current.maximized).toBe(false);
  });

  it('a refused fullscreen falls back to the overlay; exit leaves a real fullscreen', async () => {
    setFullscreenEnabled(true);
    const el = document.createElement('div');
    el.requestFullscreen = vi.fn(() => Promise.reject(new Error('denied')));
    const { result } = renderHook(() => useMaximize({ current: el }));
    await act(async () => result.current.toggle());
    expect(result.current.mode).toBe('overlay');
    const exitFullscreen = vi.fn(() => Promise.resolve());
    document.exitFullscreen = exitFullscreen;
    setFullscreenElement(el);
    act(() => result.current.exit());
    expect(exitFullscreen).toHaveBeenCalled();
    expect(result.current.maximized).toBe(false);
  });
});
