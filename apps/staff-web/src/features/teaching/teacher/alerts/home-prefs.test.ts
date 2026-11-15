import { act, renderHook } from '@testing-library/react';
import { DEFAULT_HOME_PREFS, HOME_PREFS_KEY } from '@ab/client-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reloadHomePrefs, saveHomePrefs, useHomePrefs } from './home-prefs';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  reloadHomePrefs();
});

describe('useHomePrefs', () => {
  it('defaults to everything on and comfortable rows', () => {
    expect(renderHook(() => useHomePrefs()).result.current).toEqual(DEFAULT_HOME_PREFS);
  });

  it('reads what this browser saved', () => {
    localStorage.setItem(HOME_PREFS_KEY, JSON.stringify({ hero: false }));
    expect(renderHook(() => useHomePrefs()).result.current.hero).toBe(false);
  });

  it('applies and saves a change, re-rendering the readers', () => {
    const { result } = renderHook(() => useHomePrefs());
    act(() => saveHomePrefs({ ...DEFAULT_HOME_PREFS, density: 'compact' }));
    expect(result.current.density).toBe('compact');
    expect(JSON.parse(localStorage.getItem(HOME_PREFS_KEY) ?? '{}')).toMatchObject({ density: 'compact' });
  });

  it('keeps the defaults and the choice when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useHomePrefs());
    expect(result.current).toEqual(DEFAULT_HOME_PREFS);
    act(() => saveHomePrefs({ ...DEFAULT_HOME_PREFS, ended: false }));
    expect(result.current.ended).toBe(false);
  });
});
