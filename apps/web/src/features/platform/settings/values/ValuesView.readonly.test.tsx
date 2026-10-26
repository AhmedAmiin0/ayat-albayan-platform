import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { findRow, renderValues } from './values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => ({ write: true }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: (p: string) => p !== 'settings.write' || granted.write }),
}));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const v = t.settingsValues;
const ts = t.templates.settings;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  granted.write = true;
});

describe('«القيم» — read-only and module-owned rows', () => {
  it('without settings.write: «للاطلاع فقط», values as text, no editors, no menus; only the description lines', async () => {
    granted.write = false;
    renderValues(apiFetch);
    const row = await findRow(t.settings.bookingHorizonWeeks);
    expect(screen.getAllByText(v.readOnly).length).toBeGreaterThan(0);
    expect(within(row).getAllByText(v.units.weeks.few.replace('{n}', '5'))).toHaveLength(2); // value and default
    const table = screen.getByRole('table');
    expect(within(table).queryByRole('spinbutton')).toBeNull();
    expect(within(table).queryByRole('switch')).toBeNull();
    // The one kind of button left: the description line, which opens the text to read (states.html).
    const buttons = within(table).queryAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((b) => b.getAttribute('aria-haspopup') === 'dialog')).toBe(true);
    expect(within(table).queryByRole('button', { name: new RegExp(v.menu.replace('{name}', '')) })).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(t.config.custom.add) })).toBeNull();
  });

  it('«الإشعارات» rows are text with a link to «التواصل» › «الإشعارات», never an editor', async () => {
    renderValues(apiFetch, { search: { group: 'notifications' } });
    const row = await findRow(ts.reminderMinutesBefore);
    expect(within(row).queryByRole('spinbutton')).toBeNull();
    expect(within(row).getByRole('link', { name: v.editFrom.communications }).getAttribute('href')).toBe('/admin/settings/communications?tab=catalogue');
    const table = screen.getByRole('table');
    expect(within(table).queryByRole('switch')).toBeNull();
    expect(within(table).queryByRole('textbox')).toBeNull();
  });

  it('«مزامنة Google» shows the three values from the Google status, linked to its page', async () => {
    renderValues(apiFetch, { search: { group: 'google' }, google: { enabled: true, mode: 'live', window_days: 30 } });
    const row = await findRow(t.googleSync.switches.enabled);
    await waitFor(() => expect(within(row).getByText(t.googleSync.switches.on)).toBeTruthy());
    expect(within(row).getByRole('link', { name: v.editFrom.google }).getAttribute('href')).toContain('/admin/settings/google');
    expect(within(await findRow(t.googleSync.switches.mode)).getByText(t.googleSync.switches.live)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/admin/google/status');
  });

  it('«قيم مخصصة»: one row per entry, its menu edits and deletes', async () => {
    const entry = { key: 'promo.banner', value: { a: 1 }, description: 'نص الترحيب', isPublic: true, updatedAt: '2026-10-05T10:00:00Z', updatedBy: null };
    renderValues(apiFetch, { search: { group: 'custom' }, custom: [entry] });
    const row = await findRow('نص الترحيب');
    expect(within(row).getByText('{"a":1}')).toBeTruthy();
    expect(within(row).getByText(v.tags.public)).toBeTruthy();
  });
});
