import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { THEME_KEY } from '@ab/web-kit/lib/theme';
import { ThemeToggle } from '@ab/web-kit/components/ui/layout/ThemeToggle';

afterEach(() => localStorage.clear());

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');
const theme = () => document.documentElement.getAttribute('data-theme');

describe('ThemeToggle', () => {
  it('starts from the stored choice and switches <html data-theme>', () => {
    localStorage.setItem(THEME_KEY, 'light');
    render(<ThemeToggle />);
    expect(pressed(t.theme.light)).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: t.theme.dark }));
    expect(theme()).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(pressed(t.theme.dark)).toBe('true');
  });

  it('shows the labels as text in the regular size', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: t.theme.light }).textContent).toBe(t.theme.light);
    expect(screen.getByRole('button', { name: t.theme.light }).querySelector('svg')).toBeNull();
  });
});
