import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { numberView } from './numbers.fixture';
import { renderPanel } from './numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const a = t.numbers.actions;
const card = (label: string) => screen.findByRole('article', { name: label });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('a number’s buttons', () => {
  it('enabling a spare PATCHes at once; unsetting a default asks first, then PATCHes the one field', async () => {
    renderPanel(apiFetch);
    apiSend.mockResolvedValue(numberView());
    fireEvent.click(within(await card('Spare line')).getByRole('button', { name: a.enable }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/numbers/num-2', { enabled: true }));
    apiSend.mockClear();
    fireEvent.click(within(await card('Notifications line')).getByRole('button', { name: a.unsetDefault }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(a.confirmUnsetDefault)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/numbers/num-1', { is_default: false }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('turning off a default asks first; cancelling sends nothing', async () => {
    renderPanel(apiFetch);
    fireEvent.click(within(await card('Notifications line')).getByRole('button', { name: a.disable }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(a.confirmDisableDefault)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a 409 is shown in words on the card', async () => {
    renderPanel(apiFetch);
    apiSend.mockRejectedValue(new ApiError(409, { message: 'default_taken' }));
    const spare = await card('Spare line');
    fireEvent.click(within(spare).getByRole('button', { name: a.enable }));
    expect(await within(spare).findByText(t.numbers.errors.default_taken)).toBeTruthy();
  });

  it('delete asks first, then DELETEs', async () => {
    renderPanel(apiFetch);
    fireEvent.click(within(await card('Spare line')).getByRole('button', { name: a.delete }));
    const dialog = screen.getByRole('dialog', { name: a.delete });
    expect(within(dialog).getByText(a.deleteConfirm)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(within(dialog).getByRole('button', { name: a.delete }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/admin/numbers/num-2'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
