import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { answerPatch } from '@/test/entries-fixture';
import { findRow, renderValues } from './values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/inbox/test-utils')).MockLink }));

const v = t.settingsValues;
const c = v.conflict;
const HORIZON = t.settings.bookingHorizonWeeks;
const CONFLICT = { code: 'conflict', key: 'booking_horizon_weeks', current: 6, version: 4, updatedAt: null, updatedByName: 'سارة' };
const URL = '/config/entries/booking_horizon_weeks';

afterEach(() => {
  vi.unstubAllGlobals();
  apiFetch.mockReset();
  apiSend.mockReset();
});

async function conflictOnDesktop() {
  apiSend.mockRejectedValueOnce(new ApiError(409, CONFLICT)).mockImplementation(answerPatch);
  renderValues(apiFetch);
  const row = await findRow(HORIZON);
  fireEvent.change(within(row).getByLabelText(HORIZON), { target: { value: '8' } });
  fireEvent.click(within(row).getByRole('button', { name: `${t.common.save}: ${HORIZON}` }));
  const alert = await screen.findByRole('alert');
  return { row, alert };
}

describe('«القيم» — 409 conflict row', () => {
  it('an inline row under the row, spanning every column: who, their value, mine; the edit stays', async () => {
    const { row, alert } = await conflictOnDesktop();
    const tr = alert.closest('tr');
    expect(tr?.previousElementSibling).toBe(row);
    expect(tr?.querySelector('td')?.getAttribute('colspan')).toBe('5');
    expect(alert.textContent).toContain('سارة');
    expect(alert.textContent).toContain(v.units.weeks.few.replace('{n}', '6'));
    expect(alert.textContent).toContain(v.units.weeks.few.replace('{n}', '8'));
    expect((within(row).getByLabelText(HORIZON) as HTMLInputElement).value).toBe('8');
  });

  it('«احفظ قيمتي» sends the edit again with the newer version; the row and toast follow', async () => {
    const { alert } = await conflictOnDesktop();
    fireEvent.click(within(alert).getByRole('button', { name: `${c.keepMine}: ${HORIZON}` }));
    await waitFor(() => expect(apiSend).toHaveBeenLastCalledWith('PATCH', URL, { value: 8, expectedVersion: 4 }));
    await screen.findByText(v.saved);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('«اعتمد القيمة الجديدة» drops the edit and the conflict row; nothing more is sent', async () => {
    const { row, alert } = await conflictOnDesktop();
    fireEvent.click(within(alert).getByRole('button', { name: `${c.takeTheirs}: ${HORIZON}` }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(within(row).queryByText(v.unsavedRow)).toBeNull();
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('on a phone the conflict is drawn inside the sheet; the row says «قيمة أحدث من سارة»', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    apiSend.mockRejectedValueOnce(new ApiError(409, CONFLICT)).mockImplementation(answerPatch);
    renderValues(apiFetch);
    fireEvent.click(within(await findRow(HORIZON)).getByRole('button'));
    const sheet = screen.getByRole('dialog', { name: HORIZON });
    expect(within(sheet).getByRole('button', { name: v.describe.edit })).toBeTruthy();
    fireEvent.change(within(sheet).getByLabelText(HORIZON), { target: { value: '8' } });
    fireEvent.click(within(sheet).getByRole('button', { name: v.sheet.save }));
    const alert = await within(sheet).findByRole('alert');
    expect(within(await findRow(HORIZON)).getByText(c.phoneLine.replace('{name}', 'سارة'))).toBeTruthy();
    fireEvent.click(within(alert).getByRole('button', { name: `${c.keepMine}: ${HORIZON}` }));
    await waitFor(() => expect(apiSend).toHaveBeenLastCalledWith('PATCH', URL, { value: 8, expectedVersion: 4 }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: HORIZON })).toBeNull());
  });
});
