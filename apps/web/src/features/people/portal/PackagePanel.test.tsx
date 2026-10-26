import { intlLocale } from '@ab/shared';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { PackagePanel } from './PackagePanel';
import { kid } from './portal.fixtures';
import { renderPortal } from './portal.render';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const PKG = { package: '8', duration: 30, lessons_total: 8, remaining: 5, starts_on: '2026-10-01', renews_on: '2026-11-01', status: 'unpaid' };

describe('PackagePanel «الباقة»', () => {
  afterEach(() => apiFetch.mockReset());

  it('name, lessons left, renewal date and a family-worded status; no money anywhere', async () => {
    apiFetch.mockResolvedValue({ package: PKG });
    renderPortal(<PackagePanel student={kid()} renewUrl="https://wa.me/966500000000" />);
    expect(await screen.findByText(t.enums.packageSize['8'])).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    const day = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date('2026-11-01T00:00:00Z'));
    expect(screen.getByText(day)).toBeTruthy();
    expect(screen.queryByText('2026-11-01')).toBeNull();
    expect(screen.getByText(t.portal.packageStatus.unpaid)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.portal.renew }).getAttribute('href')).toBe('https://wa.me/966500000000');
    expect(document.body.textContent).not.toMatch(/SAR|ر\.س|ريال|مدفوع/);
  });

  it('without a chat number the renewal link is hidden', async () => {
    apiFetch.mockResolvedValue({ package: { ...PKG, renews_on: null } });
    renderPortal(<PackagePanel student={kid()} renewUrl={null} />);
    expect(await screen.findByText(t.portal.remaining)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText(t.portal.renewsOn)).toBeNull();
  });
});
