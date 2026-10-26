import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { UserDetailDialog } from './UserDetailDialog';
import { fakeApi, renderWithClient } from '../users-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const onDone = vi.fn();
const open = (canWrite = true) => renderWithClient(<UserDetailDialog userId="u1" canWrite={canWrite} onClose={() => undefined} onDone={onDone} />);
const button = (name: string) => screen.findByRole('button', { name });

describe('UserDetailDialog', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(fakeApi());
    apiSend.mockReset();
    onDone.mockReset();
  });

  it('saves only the fields that changed', async () => {
    apiSend.mockResolvedValue({});
    open();
    fireEvent.change(await screen.findByLabelText(new RegExp(`^${t.users.form.fullName}`)), { target: { value: 'سارة محمد' } });
    fireEvent.click(await button(t.users.detail.save));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/users/u1', { full_name: 'سارة محمد' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.users.toast.saved));
  });

  it('without users.write: read only, no save and no actions', async () => {
    open(false);
    const name = await screen.findByLabelText(new RegExp(`^${t.users.form.fullName}`));
    expect(name).toHaveProperty('disabled', true);
    expect(screen.queryByRole('button', { name: t.users.detail.save })).toBeNull();
    for (const label of Object.values(t.users.actions)) expect(screen.queryByRole('button', { name: label })).toBeNull();
    expect(screen.getByText(t.users.detail.readOnly)).toBeTruthy();
  });

  it('disables with an optional reason', async () => {
    apiSend.mockResolvedValue({});
    open();
    fireEvent.click(await button(t.users.actions.disable));
    const dialog = screen.getByRole('dialog', { name: t.users.disable.title });
    fireEvent.change(within(dialog).getByLabelText(t.users.disable.reason), { target: { value: 'ترك العمل' } });
    fireEvent.click(within(dialog).getByRole('button', { name: t.users.disable.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/users/u1/disable', { reason: 'ترك العمل' }));
  });

  it('resets the password and shows the generated one once', async () => {
    apiSend.mockResolvedValue({ user: {}, credential: { kind: 'password', value: 'Reset-Pass-9' } });
    open();
    fireEvent.click(await button(t.users.actions.resetPassword));
    fireEvent.click(screen.getByRole('button', { name: t.users.reset.confirm }));
    expect(await screen.findByTestId('issued-credential')).toHaveProperty('textContent', 'Reset-Pass-9');
    expect(apiSend).toHaveBeenCalledWith('POST', '/users/u1/reset-password', { credential: 'generate' });
  });

  it('signs the user out everywhere', async () => {
    apiSend.mockResolvedValue(undefined);
    open();
    fireEvent.click(await button(t.users.actions.signOut));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/users/u1/sign-out', {}));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.users.toast.signedOut));
  });

  it('deletes a user without history', async () => {
    apiSend.mockResolvedValue(undefined);
    open();
    fireEvent.click(await button(t.users.actions.delete));
    fireEvent.click(screen.getByRole('button', { name: t.users.delete.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/users/u1'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.users.toast.deleted));
  });

  it('a user with history: lists the tables and offers «تعطيل بدلًا من الحذف»', async () => {
    const references = [{ table: 'payments', column: 'created_by', count: 4 }, { table: 'brand_new_table', column: 'x', count: 2 }];
    apiSend.mockImplementation(async (method: string) => {
      if (method === 'DELETE') throw new ApiError(409, { code: 'users_has_history', message: 'users_has_history', references, hint: 'disable_instead' });
      return {};
    });
    open();
    fireEvent.click(await button(t.users.actions.delete));
    fireEvent.click(screen.getByRole('button', { name: t.users.delete.confirm }));
    expect(await screen.findByText(t.users.tables.payments)).toBeTruthy();
    expect(screen.getByText('brand_new_table')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.users.delete.confirm })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.users.delete.disableInstead }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/users/u1/disable', {}));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.users.toast.disabled));
  });

  it('a delete refused for another reason shows its message', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'last_admin', message: 'last_admin' }));
    open();
    fireEvent.click(await button(t.users.actions.delete));
    fireEvent.click(screen.getByRole('button', { name: t.users.delete.confirm }));
    expect(await screen.findByText(t.users.errors.last_admin)).toBeTruthy();
  });
});
