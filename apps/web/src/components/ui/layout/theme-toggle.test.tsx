import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { THEME_KEY } from '@/lib/theme';
import { ThemeToggle } from './theme-toggle';

afterEach(() => localStorage.clear());

describe('ThemeToggle', () => {
  it('starts from the stored choice and switches <html data-theme>', () => {
    localStorage.setItem(THEME_KEY, 'light');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: t.theme.light }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: t.theme.dark }));
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: t.theme.dark }).getAttribute('aria-pressed')).toBe('true');
  });
});
