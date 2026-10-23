import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { CONFIG_QUERY_KEYS } from '@/lib/query-keys';
import { CATALOGUE_QUERY_KEY } from '../notification-catalogue/catalogue-api';
import { fetchCount, renderPanel } from './numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const s = t.numbers.source;

async function openConfirm() {
  const kit = renderPanel(apiFetch);
  fireEvent.click(await screen.findByRole('button', { name: s.toModule }));
  return { ...kit, dialog: screen.getByRole('dialog', { name: s.confirmTitle }) };
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('the source switch: confirm, then POST', () => {
  it('the dialog states the consequence and the parity; confirm POSTs and refetches parity, numbers and settings', async () => {
    const { client, onSaved, dialog } = await openConfirm();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    expect(within(dialog).getByText(s.confirmModule)).toBeTruthy();
    expect(within(dialog).getByText(t.numbers.parity.empty)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue({ source: 'module' });
    fireEvent.click(within(dialog).getByRole('button', { name: s.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/admin/communications/source', { source: 'module' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onSaved).toHaveBeenCalledWith(s.changed);
    expect(fetchCount(apiFetch, '/admin/communications/parity')).toBe(2);
    expect(fetchCount(apiFetch, '/admin/numbers')).toBe(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CONFIG_QUERY_KEYS.settings });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CATALOGUE_QUERY_KEY });
  });

  it('a 409 parity_not_empty stays inside the dialog, in words', async () => {
    const { dialog } = await openConfirm();
    apiSend.mockRejectedValue(new ApiError(409, { message: 'parity_not_empty' }));
    fireEvent.click(within(dialog).getByRole('button', { name: s.confirm }));
    expect(await within(dialog).findByText(t.numbers.errors.parity_not_empty)).toBeTruthy();
    expect(screen.getByRole('dialog', { name: s.confirmTitle })).toBeTruthy();
    // The refusal means the page's parity is out of date: it is fetched again.
    await waitFor(() => expect(fetchCount(apiFetch, '/admin/communications/parity')).toBe(2));
  });
});
