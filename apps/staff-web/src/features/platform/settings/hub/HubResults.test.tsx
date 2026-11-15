import { counted } from '@ab/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { HubResults } from './HubResults';

const H = t.settingsHub;

describe('HubResults (the hub search results)', () => {
  it('one link per hit, with where it lives and the key in LTR', () => {
    render(
      <HubResults
        hits={[
          { id: 'setting:upload_max_mb', label: 'L', where: 'W', href: '/admin/settings/values?group=uploads&q=x', settingKey: 'upload_max_mb' },
          { id: 'page:numbers', label: t.numbers.title, where: 'C', href: '/admin/settings/communications?tab=numbers' },
        ]}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe(counted(H.resultsCount, 2));
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/admin/settings/values?group=uploads&q=x',
      '/admin/settings/communications?tab=numbers',
    ]);
    expect(screen.getByText('upload_max_mb').getAttribute('dir')).toBe('ltr');
  });

  it('no hit: «لا توجد إعدادات تطابق بحثك.» in the live region, no list', () => {
    render(<HubResults hits={[]} />);
    expect(screen.getByRole('status').textContent).toBe(t.config.search.none);
    expect(screen.queryByRole('list')).toBeNull();
  });
});
