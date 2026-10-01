import { afterEach, describe, expect, it } from 'vitest';
import { readThemePref, resolveTheme, setThemePref, THEME_KEY } from './theme';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme preference', () => {
  it('resolves auto from the system and keeps explicit choices', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('reads unknown or missing values as auto', () => {
    expect(readThemePref()).toBe('auto');
    localStorage.setItem(THEME_KEY, 'sepia');
    expect(readThemePref()).toBe('auto');
  });

  it('stores dark and sets data-theme on <html>', () => {
    setThemePref('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(readThemePref()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('auto clears the stored choice and resolves (no matchMedia in jsdom → light)', () => {
    setThemePref('dark');
    setThemePref('auto');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
