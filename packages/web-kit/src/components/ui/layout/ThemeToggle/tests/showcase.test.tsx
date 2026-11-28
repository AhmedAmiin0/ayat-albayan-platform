import { render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ThemeToggleShowcase } from '@ab/web-kit/components/ui/layout/ThemeToggle/ThemeToggle.showcase';

afterEach(() => localStorage.clear());

it('shows the full and the compact switch in each direction and theme', () => {
  render(<ThemeToggleShowcase />);
  for (const key of ['rtl-light', 'rtl-dark', 'ltr-light', 'ltr-dark']) {
    const frame = screen.getByRole('region', { name: key });
    expect(within(frame).getAllByRole('group', { name: t.theme.label })).toHaveLength(2);
    expect(within(frame).getAllByRole('button', { name: t.theme.dark })).toHaveLength(2);
  }
  expect(screen.getByRole('region', { name: 'ltr-dark' }).getAttribute('data-theme')).toBe('dark');
});
