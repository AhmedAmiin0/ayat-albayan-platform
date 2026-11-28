import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { readThemePref, THEME_KEY } from '@ab/web-kit/lib/theme';
import { ThemeToggle } from '@ab/web-kit/components/ui/layout/ThemeToggle';

afterEach(() => localStorage.clear());

const group = () => screen.getByRole('group', { name: t.theme.label });

describe('ThemeToggle size="compact"', () => {
  it('draws one icon per segment, named by its label, with no visible text', () => {
    render(<ThemeToggle size="compact" />);
    const buttons = within(group()).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      t.theme.auto,
      t.theme.light,
      t.theme.dark,
    ]);
    for (const b of buttons) {
      expect(b.textContent).toBe('');
      expect(b.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(b.className.split(' ')).toEqual(expect.arrayContaining(['min-h-11', 'min-w-11']));
    }
  });

  it('changes and keeps the same preference as the full switch', () => {
    render(<ThemeToggle size="compact" />);
    fireEvent.click(screen.getByRole('button', { name: t.theme.dark }));
    expect(readThemePref()).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: t.theme.auto }));
    expect(readThemePref()).toBe('auto');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: t.theme.auto }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('a compact and a full switch read the same stored choice', () => {
    localStorage.setItem(THEME_KEY, 'light');
    render(<ThemeToggle size="compact" />);
    expect(screen.getByRole('button', { name: t.theme.light }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
});
