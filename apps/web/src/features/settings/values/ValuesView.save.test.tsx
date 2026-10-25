import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { answerPatch, entryOf } from '@/test/entries-fixture';
import { findRow, renderValues } from './values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/inbox/test-utils')).MockLink }));

const v = t.settingsValues;
const HORIZON = t.settings.bookingHorizonWeeks;
const MAKEUP = t.settings.makeupWindowDays;
const saveOf = (row: HTMLElement, label = HORIZON) => within(row).getByRole('button', { name: `${t.common.save}: ${label}` });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«القيم» — each row saves on its own', () => {
  it('sends only that row’s key; shows «جارٍ الحفظ…» and aria-busy; then the toast with «تراجع»', async () => {
    let answer: (v: unknown) => void = () => undefined;
    apiSend.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    renderValues(apiFetch);
    const row = await findRow(HORIZON);
    fireEvent.change(within(row).getByLabelText(HORIZON), { target: { value: '8' } });
    expect(within(row).getByText(v.unsavedRow)).toBeTruthy();
    fireEvent.click(saveOf(row));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/config/entries/booking_horizon_weeks', { value: 8, expectedVersion: 1 }));
    expect(row.getAttribute('aria-busy')).toBe('true');
    expect(within(row).getByRole('status').textContent).toBe(v.saving);
    expect((within(row).getByLabelText(HORIZON) as HTMLInputElement).disabled).toBe(true);
    answer({ entry: entryOf('booking_horizon_weeks', { value: 8, version: 2 }) });
    const toast = await screen.findByText(v.saved);
    expect(within(toast.closest('[data-undo-toast]') as HTMLElement).getByRole('button', { name: v.undo })).toBeTruthy();
  });

  it('saving row A never resets dirty row B, and edits survive a group switch', async () => {
    apiSend.mockImplementation(answerPatch);
    renderValues(apiFetch);
    const a = await findRow(HORIZON);
    const b = await findRow(MAKEUP);
    fireEvent.change(within(a).getByLabelText(HORIZON), { target: { value: '8' } });
    fireEvent.change(within(b).getByLabelText(MAKEUP), { target: { value: '30' } });
    fireEvent.click(saveOf(a));
    await screen.findByText(v.saved);
    expect((within(b).getByLabelText(MAKEUP) as HTMLInputElement).value).toBe('30');
    expect(apiSend).toHaveBeenCalledTimes(1);
    const nav = screen.getByRole('navigation', { name: v.groupsNav });
    fireEvent.click(within(nav).getByRole('button', { name: new RegExp(t.settings.sections.reports) }));
    fireEvent.click(within(nav).getByRole('button', { name: new RegExp(t.settings.sections.schedule) }));
    const again = await findRow(MAKEUP);
    expect((within(again).getByLabelText(MAKEUP) as HTMLInputElement).value).toBe('30');
    expect(screen.getByRole('button', { name: new RegExp(v.unsaved.one) })).toBeTruthy();
  });

  it('an invalid value is never sent: error line, aria-invalid, «حفظ» aria-disabled', async () => {
    renderValues(apiFetch);
    const row = await findRow(HORIZON);
    const input = within(row).getByLabelText(HORIZON);
    fireEvent.change(input, { target: { value: '40' } });
    const message = v.invalidRange.replace('{min}', '1').replace('{max}', '12');
    expect(within(row).getByText(message)).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(within(row).getByText(message).closest('p')?.id ?? 'x');
    // Named by aria-label, not by a visually hidden span (a browser reads that span as a block and
    // spaces it, «حفظ : …», so the e2e's exact «حفظ: …» found nothing).
    expect(saveOf(row).getAttribute('aria-label')).toBe(`${t.common.save}: ${HORIZON}`);
    fireEvent.click(saveOf(row));
    expect(saveOf(row).getAttribute('aria-disabled')).toBe('true');
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a refused save shows «تعذّر حفظ القيمة», the server message and «أعد المحاولة»', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(400, { message: 'out of range' })).mockImplementation(answerPatch);
    renderValues(apiFetch);
    const row = await findRow(HORIZON);
    fireEvent.change(within(row).getByLabelText(HORIZON), { target: { value: '8' } });
    fireEvent.click(saveOf(row));
    expect(await within(row).findByText(v.saveError)).toBeTruthy();
    expect(within(row).getByText('out of range')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: v.retry }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
  });

  it('a key the API moved drops the edit: the row is text with «تُدار من صفحة أخرى», nothing unsaved', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'owned_by_module' }));
    renderValues(apiFetch);
    const row = await findRow(HORIZON);
    fireEvent.change(within(row).getByLabelText(HORIZON), { target: { value: '8' } });
    fireEvent.click(saveOf(row));
    expect(await within(row).findByText(v.moved)).toBeTruthy();
    expect(within(row).queryByText(v.unsavedRow)).toBeNull();
    expect(within(row).queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(v.unsaved.one) })).toBeNull();
    expect(screen.queryByText(v.saved)).toBeNull();
  });

  it('a local edit is kept when the settings are refetched', async () => {
    const { client } = renderValues(apiFetch);
    const row = await findRow(HORIZON);
    fireEvent.change(within(row).getByLabelText(HORIZON), { target: { value: '8' } });
    await client.refetchQueries({ queryKey: ['settings'] });
    expect((within(await findRow(HORIZON)).getByLabelText(HORIZON) as HTMLInputElement).value).toBe('8');
  });
});
