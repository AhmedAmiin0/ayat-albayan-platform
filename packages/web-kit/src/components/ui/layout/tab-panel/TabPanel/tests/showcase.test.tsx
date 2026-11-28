import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import {
  TabPanelShowcase,
} from '@ab/web-kit/components/ui/layout/tab-panel/TabPanel/TabPanel.showcase';

it('shows a staff and a family strip with its open panel in each direction and theme', () => {
  render(<TabPanelShowcase />);
  for (const key of ['rtl-light', 'rtl-dark', 'ltr-light', 'ltr-dark']) {
    const frame = screen.getByRole('region', { name: key });
    expect(within(frame).getAllByRole('tablist')).toHaveLength(2);
    expect(within(frame).getByRole('tabpanel', { name: t.nav.students })).toBeTruthy();
    expect(within(frame).getByRole('tabpanel', { name: t.nav.reports })).toBeTruthy();
  }
  expect(screen.getByRole('region', { name: 'ltr-dark' }).getAttribute('data-theme')).toBe('dark');
  expect(screen.getByRole('region', { name: 'rtl-light' }).getAttribute('dir')).toBe('rtl');
});
