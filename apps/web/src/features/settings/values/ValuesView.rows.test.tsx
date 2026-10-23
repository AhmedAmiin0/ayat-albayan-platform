import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { SETTINGS } from '@/test/settings-fixture';
import { findRow, renderValues } from './values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/inbox/test-utils')).MockLink }));

const v = t.settingsValues;
const HORIZON = t.settings.bookingHorizonWeeks;
const FX = t.settings.fxFreshHours;
const named = (word: string, label = HORIZON) => ({ name: `${word}: ${label}` });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«القيم» rows — after a save', () => {
  it('a failed save, then «تراجع»: no stale «أعد المحاولة» that would re-send the old edit', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(500, null));
    renderValues(apiFetch);
    const row = await findRow(HORIZON);
    fireEvent.change(within(row).getByLabelText(HORIZON), { target: { value: '8' } });
    fireEvent.click(within(row).getByRole('button', named(t.common.save)));
    await within(row).findByText(v.saveError);
    fireEvent.click(within(row).getByRole('button', named(v.undo)));
    expect(within(row).queryByRole('button', { name: v.retry })).toBeNull();
    expect(within(row).queryByText(v.saveError)).toBeNull();
  });

  it('«أعد القيمة السابقة» re-saves the value the last save replaced', async () => {
    apiSend.mockResolvedValue(SETTINGS);
    renderValues(apiFetch, { search: { group: 'accounts' } });
    const row = await findRow(FX);
    const menuButton = () => within(row).getByRole('button', { name: v.menu.replace('{name}', FX) });
    fireEvent.click(menuButton());
    expect(within(row).queryByRole('menuitem', { name: new RegExp(v.restorePrevious) })).toBeNull();
    fireEvent.click(menuButton());
    fireEvent.change(within(row).getByLabelText(FX), { target: { value: '6' } });
    // The server now holds 6 (the refetch after the save answers with it).
    const routed = apiFetch.getMockImplementation();
    apiFetch.mockImplementation(async (path: string) => (path === '/settings' ? { ...SETTINGS, fx_fresh_hours: 6 } : routed?.(path)));
    fireEvent.click(within(row).getByRole('button', named(t.common.save, FX)));
    await screen.findByText(v.saved);
    await waitFor(() => expect((within(row).getByLabelText(FX) as HTMLInputElement).value).toBe('6'));
    fireEvent.click(menuButton());
    fireEvent.click(within(row).getByRole('menuitem', { name: new RegExp(v.restorePrevious) }));
    await waitFor(() => expect(apiSend).toHaveBeenLastCalledWith('PATCH', '/settings', { fxFreshHours: SETTINGS.fx_fresh_hours }));
  });

  it('tags are plain and neutral; «معدَّلة» is text with the half nuqta, not a coloured chip', async () => {
    renderValues(apiFetch, { search: { group: 'accounts' }, settings: { fx_fresh_hours: 6 } });
    const row = await findRow(FX);
    const modified = within(row).getByText(v.tags.modified);
    expect(modified.closest('[data-tone]')).toBeNull();
    expect(modified.querySelector('[data-glyph="half"]')).not.toBeNull();
    expect(modified.className).toContain('text-ink-2');
    renderValues(apiFetch, { search: { group: 'schedule' } });
    const tag = (await screen.findAllByText(v.tags.confirm))[0];
    expect(tag?.closest('[data-tone]')).toBeNull();
    expect(tag?.className).toContain('border-rule-strong');
  });

  it('«لم يُحفظ» is neutral ink, and the columns have fixed widths', async () => {
    renderValues(apiFetch);
    const row = await findRow(HORIZON);
    fireEvent.change(within(row).getByLabelText(HORIZON), { target: { value: '8' } });
    expect(within(row).getByText(v.unsavedRow).className).toContain('text-ink-2');
    const table = screen.getByRole('table');
    expect(table.className).toContain('table-fixed');
    expect(table.querySelectorAll('col')).toHaveLength(5);
  });
});
