import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { moneyText } from '@ab/web-kit/lib/money-text';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PackageLine } from './PackageLine';
import { packageView } from '@ab/web-kit/portal/portal.fixtures';
import { portalApi } from '@ab/web-kit/portal/portal.api-fixture';
import { renderPortal } from '@ab/web-kit/portal/portal.render';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('PackageLine', () => {
  afterEach(() => apiFetch.mockReset());

  it('used of total, the renewal day and the amount due', async () => {
    apiFetch.mockImplementation(portalApi());
    renderPortal(<PackageLine studentId="s1" />);
    expect(await screen.findByText('8 من 12')).toBeTruthy();
    expect(screen.getByText(t.portal.renewsOn, { exact: false })).toBeTruthy();
    expect(screen.getByText(moneyText(150, 'SAR'), { exact: false })).toBeTruthy();
  });

  it('nothing owed and no renewal day: those parts are hidden', async () => {
    const base = packageView().package;
    const pkg = base && { ...base, amount_due: null, renews_on: null };
    apiFetch.mockImplementation(portalApi({ package: packageView({ package: pkg }) }));
    renderPortal(<PackageLine studentId="s1" />);
    expect(await screen.findByText('8 من 12')).toBeTruthy();
    expect(screen.queryByText(t.portal.renewsOn, { exact: false })).toBeNull();
    expect(screen.queryByText(t.portal.amountDue, { exact: false })).toBeNull();
  });

  it('no package: renders nothing', async () => {
    apiFetch.mockImplementation(portalApi({ package: packageView({ package: null }) }));
    const { container } = renderPortal(<PackageLine studentId="s1" />);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });
});
