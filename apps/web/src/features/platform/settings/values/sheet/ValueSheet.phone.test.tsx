import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { SETTINGS } from '@/test/settings-fixture';
import { findRow, renderValues } from '../values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => ({ write: true }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: (p: string) => p !== 'settings.write' || granted.write }),
}));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const v = t.settingsValues;
const HORIZON = t.settings.bookingHorizonWeeks;
const ALWAYS = t.settings.teachersAlwaysAvailable;
const FIVE = v.units.weeks.few.replace('{n}', '5');

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  vi.unstubAllGlobals();
  apiFetch.mockReset();
  apiSend.mockReset();
  granted.write = true;
});

describe('«القيم» phone rows and sheet', () => {
  it('the value button is named «عدّل «الاسم»: القيمة»; a tap on the name opens the sheet too', async () => {
    renderValues(apiFetch);
    const row = await findRow(HORIZON);
    const button = within(row).getByRole('button');
    expect(button.getAttribute('aria-label')).toBe(`${v.sheet.edit.replace('{name}', HORIZON)}: ${FIVE}`);
    expect(within(button).getByText(FIVE).className).not.toContain('truncate');
    fireEvent.click(within(row).getByText(HORIZON));
    const sheet = screen.getByRole('dialog', { name: HORIZON });
    // A bottom sheet, not the full-screen one.
    expect(sheet.className).toContain('max-sm:rounded-t-lg');
    expect(within(sheet).getByText(v.units.weeks.few.replace('{n}', '').trim())).toBeTruthy();
  });

  it('read-only rows are named «الاسم: القيمة», without «عدّل»; the note shows on phones', async () => {
    granted.write = false;
    renderValues(apiFetch);
    const row = await findRow(HORIZON);
    expect(within(row).getByRole('button').getAttribute('aria-label')).toBe(`${HORIZON}: ${FIVE}`);
    expect(screen.getByText(v.readOnlyNote)).toBeTruthy();
  });

  it('after a refused «احفظ», typing the stored value back does not close the sheet', async () => {
    renderValues(apiFetch);
    fireEvent.click(within(await findRow(HORIZON)).getByRole('button'));
    const sheet = screen.getByRole('dialog', { name: HORIZON });
    const box = within(sheet).getByLabelText(HORIZON);
    fireEvent.change(box, { target: { value: '40' } });
    fireEvent.click(within(sheet).getByRole('button', { name: v.sheet.save }));
    fireEvent.change(box, { target: { value: '' } });
    fireEvent.change(box, { target: { value: String(SETTINGS.booking_horizon_weeks) } });
    expect(screen.queryByRole('dialog', { name: HORIZON })).not.toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a switch that asks first: the impact sentence in the sheet; cancelling keeps the sheet open', async () => {
    renderValues(apiFetch);
    fireEvent.click(within(await findRow(ALWAYS)).getByRole('button'));
    const sheet = screen.getByRole('dialog', { name: ALWAYS });
    const impact = sheet.querySelector('[data-impact]');
    expect(impact?.textContent).toContain(v.tags.confirm);
    expect(impact?.textContent).toContain(t.settings.hints.teachersAlwaysAvailable);
    const sw = within(sheet).getByRole('switch', { name: ALWAYS });
    expect(sw.parentElement?.className).toContain('min-h-11');
    fireEvent.click(sw);
    fireEvent.click(within(sheet).getByRole('button', { name: v.sheet.save }));
    fireEvent.click(within(screen.getByRole('dialog', { name: v.confirm.plainTitle.replace('{name}', ALWAYS) })).getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByRole('dialog', { name: ALWAYS })).not.toBeNull();
  });

  it('a key the API moved: the sheet turns to text with «تُدار من صفحة أخرى»', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'owned_by_module' }));
    renderValues(apiFetch);
    fireEvent.click(within(await findRow(HORIZON)).getByRole('button'));
    const sheet = screen.getByRole('dialog', { name: HORIZON });
    fireEvent.change(within(sheet).getByLabelText(HORIZON), { target: { value: '8' } });
    fireEvent.click(within(sheet).getByRole('button', { name: v.sheet.save }));
    await waitFor(() => expect(within(sheet).queryByRole('spinbutton')).toBeNull());
    expect(within(sheet).getAllByText(v.moved).length).toBeGreaterThan(0);
    expect(within(sheet).queryByRole('button', { name: v.sheet.save })).toBeNull();
  });
});
