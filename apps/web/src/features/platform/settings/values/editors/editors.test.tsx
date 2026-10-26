import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { answerPatch } from '@/test/entries-fixture';
import { findRow, renderValues } from '../values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const v = t.settingsValues;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«القيم» editors by type', () => {
  it('a number is described by its bounds and shows its unit', async () => {
    renderValues(apiFetch);
    const row = await findRow(t.settings.bookingHorizonWeeks);
    const input = within(row).getByLabelText(t.settings.bookingHorizonWeeks);
    const bounds = within(row).getByText(v.bounds.replace('{min}', '1').replace('{max}', '12'));
    expect(input.getAttribute('aria-describedby')).toContain(bounds.id);
    // 5 → «أسابيع» (the counted form), and no spin arrows over the digits.
    expect(within(row).getByText(v.units.weeks.few.replace('{n}', '').trim())).toBeTruthy();
    expect(input.className).toContain('[&::-webkit-inner-spin-button]:appearance-none');
  });

  it('a number that can be OFF has its switch in the same cell; OFF disables the box', async () => {
    renderValues(apiFetch);
    const row = await findRow(t.settings.lateCancelHours);
    expect((within(row).getByRole('switch', { name: t.settings.lateCancel }) as HTMLInputElement).checked).toBe(false);
    expect((within(row).getByLabelText(t.settings.lateCancelHours) as HTMLInputElement).disabled).toBe(true);
  });

  it('a phone is type=tel, LTR, with the form it will be saved in', async () => {
    renderValues(apiFetch, { search: { group: 'academy' } });
    const row = await findRow(t.settings.academyWhatsapp);
    const input = within(row).getByLabelText(t.settings.academyWhatsapp);
    expect(input.getAttribute('type')).toBe('tel');
    expect(input.getAttribute('dir')).toBe('ltr');
    fireEvent.change(input, { target: { value: '+966 50 000 0000' } });
    expect(within(row).getByText('+966500000000')).toBeTruthy();
  });

  it('a two-field value is a summary + «عدّل الحقلين»; the dialog saves both in one key', async () => {
    apiSend.mockImplementation(answerPatch);
    renderValues(apiFetch, { search: { group: 'academy' } });
    const row = await findRow(t.config.academyContact);
    expect(within(row).getAllByText('ayatalbayan.com')).toHaveLength(2); // value and default
    fireEvent.click(within(row).getByRole('button', { name: `${v.shapeEdit}: ${t.config.academyContact}` }));
    const dialog = screen.getByRole('dialog', { name: t.config.academyContact });
    fireEvent.change(within(dialog).getByLabelText(t.config.fields.email), { target: { value: 'a@b.co' } });
    fireEvent.click(within(dialog).getByRole('button', { name: v.shapeSave }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/config/entries/academy_contact', { value: { site: 'ayatalbayan.com', email: 'a@b.co' }, expectedVersion: 1 }),
    );
  });

  it('a select of choices (currency) saves its one key', async () => {
    apiSend.mockImplementation(answerPatch);
    renderValues(apiFetch, { search: { group: 'accounts' } });
    const row = await findRow(t.settings.reportingCurrency);
    fireEvent.change(within(row).getByLabelText(t.settings.reportingCurrency), { target: { value: 'USD' } });
    fireEvent.click(within(row).getByRole('button', { name: `${t.common.save}: ${t.settings.reportingCurrency}` }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/config/entries/reporting_currency', { value: 'USD', expectedVersion: 1 }));
  });
});
