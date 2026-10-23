import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SETTINGS } from '@/test/settings-fixture';
import { findRow, renderValues } from './values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/inbox/test-utils')).MockLink }));

const v = t.settingsValues;
const c = v.confirm;
const ALWAYS = t.settings.teachersAlwaysAvailable;
const ACTIVITY = t.config.activityRetentionDays;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«القيم» — confirmations and the row menu', () => {
  it('a booking-wide switch asks first (cancel is the default and puts it back); yes saves it alone', async () => {
    apiSend.mockResolvedValue(SETTINGS);
    renderValues(apiFetch);
    const row = await findRow(ALWAYS);
    const sw = within(row).getByRole('switch', { name: ALWAYS });
    fireEvent.click(sw);
    const dialog = screen.getByRole('dialog', { name: c.plainTitle.replace('{name}', ALWAYS) });
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.cancel }));
    expect(apiSend).not.toHaveBeenCalled();
    expect((within(row).getByRole('switch', { name: ALWAYS }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(row).getByRole('switch', { name: ALWAYS }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: v.confirmYes.teachersAlwaysAvailable.off }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { teachersAlwaysAvailable: false }));
  });

  it('retention days that delete data need the number typed before saving', async () => {
    apiSend.mockResolvedValue(SETTINGS);
    renderValues(apiFetch, { search: { group: 'retention' } });
    const row = await findRow(ACTIVITY);
    fireEvent.change(within(row).getByLabelText(ACTIVITY), { target: { value: '30' } });
    fireEvent.click(within(row).getByRole('button', { name: `${t.common.save}: ${ACTIVITY}` }));
    const dialog = screen.getByRole('dialog', { name: c.typedTitleCount.replace('{count}', v.units.days.other.replace('{n}', '30')) });
    const yes = within(dialog).getByRole('button', { name: c.typedYes });
    expect(yes.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(yes);
    expect(apiSend).not.toHaveBeenCalled();
    // Typed on an Arabic keypad: «٣٠» is 30.
    fireEvent.change(within(dialog).getByLabelText(c.typedLabel.replace('{n}', '30')), { target: { value: '٣٠' } });
    fireEvent.click(within(dialog).getByRole('button', { name: c.typedYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { activityRetentionDays: 30 }));
  });

  it('the «⋯» menu: «أعد القيمة الافتراضية» only when changed, and the developer key', async () => {
    apiSend.mockResolvedValue(SETTINGS);
    renderValues(apiFetch, { search: { group: 'accounts' }, settings: { fx_fresh_hours: 6 } });
    const fx = await findRow(t.settings.fxFreshHours);
    expect(within(fx).getByText(v.tags.modified)).toBeTruthy();
    fireEvent.click(within(fx).getByRole('button', { name: v.menu.replace('{name}', t.settings.fxFreshHours) }));
    const menu = within(fx).getByRole('menu');
    expect(within(menu).getByText('fx_fresh_hours')).toBeTruthy();
    fireEvent.click(within(menu).getByRole('menuitem', { name: v.resetDefault }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { fxFreshHours: 24 }));
    const currency = await findRow(t.settings.reportingCurrency);
    fireEvent.click(within(currency).getByRole('button', { name: v.menu.replace('{name}', t.settings.reportingCurrency) }));
    expect(within(currency).queryByRole('menuitem', { name: v.resetDefault })).toBeNull();
    expect(within(currency).getByRole('menuitem', { name: new RegExp(v.copyKey) })).toBeTruthy();
  });
});
