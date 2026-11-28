import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ClockToggleShowcase } from '@ab/web-kit/components/ui/layout/ClockToggle/ClockToggle.showcase';

it('renders both sizes in the four direction and theme frames', () => {
  render(<ClockToggleShowcase />);
  const rows = screen.getAllByRole('listitem');
  expect(rows.map((r) => [r.getAttribute('dir'), r.getAttribute('data-theme')].join('-'))).toEqual([
    'rtl-light',
    'rtl-dark',
    'ltr-light',
    'ltr-dark',
  ]);
  expect(screen.getAllByRole('group', { name: t.clock.label })).toHaveLength(8);
  expect(screen.getAllByRole('button', { name: t.clock.h24 })).toHaveLength(8);
});
