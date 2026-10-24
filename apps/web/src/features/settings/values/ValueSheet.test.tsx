import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { answerPatch } from '@/test/entries-fixture';
import { findRow, renderValues } from './values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/inbox/test-utils')).MockLink }));

const v = t.settingsValues;
const HORIZON = t.settings.bookingHorizonWeeks;

beforeEach(() => {
  // A phone: every width query matches (below 640px and below the shell).
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  vi.unstubAllGlobals();
  apiFetch.mockReset();
  apiSend.mockReset();
});

const openSheet = async () => {
  const row = await findRow(HORIZON);
  fireEvent.click(within(row).getByRole('button', { name: new RegExp(v.sheet.edit.replace('{name}', HORIZON)) }));
  return screen.getByRole('dialog', { name: HORIZON });
};

describe('«القيم» on a phone', () => {
  it('two columns, group chips, and the value cell is one button to the sheet', async () => {
    renderValues(apiFetch);
    await findRow(HORIZON);
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([v.cols.name, v.cols.value]);
    expect(screen.queryByRole('button', { name: new RegExp(v.filterModified) })).toBeNull();
    const sheet = await openSheet();
    expect(within(sheet).getByText(v.bounds.replace('{min}', '1').replace('{max}', '12'))).toBeTruthy();
    expect(within(sheet).getByText(v.sheet.dev)).toBeTruthy();
    expect(within(sheet).getByText('booking_horizon_weeks')).toBeTruthy();
  });

  it('«احفظ» saves the row alone and closes the sheet', async () => {
    apiSend.mockImplementation(answerPatch);
    renderValues(apiFetch);
    const sheet = await openSheet();
    fireEvent.change(within(sheet).getByLabelText(HORIZON), { target: { value: '7' } });
    fireEvent.click(within(sheet).getByRole('button', { name: v.sheet.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/config/entries/booking_horizon_weeks', { value: 7, expectedVersion: 1 }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: HORIZON })).toBeNull());
  });

  it('closing with an unsaved edit asks first', async () => {
    renderValues(apiFetch);
    const sheet = await openSheet();
    fireEvent.change(within(sheet).getByLabelText(HORIZON), { target: { value: '7' } });
    fireEvent.click(within(sheet).getByRole('button', { name: t.common.cancel }));
    const ask = screen.getByRole('dialog', { name: v.sheet.discardTitle });
    fireEvent.click(within(ask).getByRole('button', { name: v.sheet.discard }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
