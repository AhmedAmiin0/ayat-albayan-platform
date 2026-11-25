import { intlLocale } from '@ab/core';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { moneyText } from '@ab/web-kit/lib/money-text';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { PackagePanel } from './PackagePanel';
import { kid, packageView } from '@ab/web-kit/portal/portal.fixtures';
import { renderPortal } from '@ab/web-kit/portal/portal.render';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const day = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

describe('PackagePanel «الباقة» (guardian / adult)', () => {
  afterEach(() => apiFetch.mockReset());

  it('name, «8 من 12», dates, status, the amount due, payments and the transfer text', async () => {
    apiFetch.mockResolvedValue(packageView());
    renderPortal(<PackagePanel student={kid()} />);
    expect(await screen.findByText(t.enums.packageSize['12'])).toBeTruthy();
    expect(screen.getByText('8 من 12')).toBeTruthy();
    expect(screen.getByText(day('2026-11-01'))).toBeTruthy();
    expect(screen.queryByText('2026-11-01')).toBeNull();
    expect(screen.getByText(t.portal.packageStatus.active)).toBeTruthy();
    expect(screen.getByText(moneyText(150, 'SAR'))).toBeTruthy();
    expect(screen.getByText(moneyText(300, 'SAR'))).toBeTruthy();
    expect(screen.getByText('تحويل بنكي إلى الحساب 0000')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/package');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('nothing owed, no payments, empty instructions: those parts are hidden', async () => {
    const base = packageView();
    const pkg = base.package && { ...base.package, amount_due: null, renews_on: null };
    apiFetch.mockResolvedValue({ package: pkg, payments: [], payment_instructions: ' ' });
    renderPortal(<PackagePanel student={kid()} />);
    expect(await screen.findByText(t.portal.remaining)).toBeTruthy();
    const { amountDue, payments, paymentInstructions, renewsOn } = t.portal;
    for (const hidden of [amountDue, payments, paymentInstructions, renewsOn]) {
      expect(screen.queryByText(hidden)).toBeNull();
    }
  });

  it('no package: the empty state, with no link to chat on WhatsApp', async () => {
    apiFetch.mockResolvedValue({ package: null });
    renderPortal(<PackagePanel student={kid()} />);
    expect(await screen.findByText(t.portal.packageEmpty)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
