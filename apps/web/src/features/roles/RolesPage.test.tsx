import type { RoleView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { RolesPage } from './RolesPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: {} } }) } } }));

const ADMIN: RoleView = { id: 'sys', key: 'admin', name_ar: 'مدير', name_en: 'Admin', base_role: 'admin', is_system: true, permissions: ['*'], user_count: 2 };
const CLERK: RoleView = { id: 'r1', key: 'clerk', name_ar: 'محاسب', name_en: 'Clerk', base_role: 'admin', is_system: false, permissions: ['payments.view'], user_count: 0 };
const BUSY: RoleView = { ...CLERK, id: 'r2', key: 'busy', name_ar: 'مراجع', user_count: 3 };

const me = (permissions: string[]) => ({ id: 'u', email: null, role: 'admin', fullName: null, locale: null, tz: null, roleKey: 'x', permissions });

function renderPage(roles: RoleView[], perms: string[] = ['*']) {
  apiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? me(perms) : roles));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RolesPage />
    </QueryClientProvider>,
  );
  // /auth/me is cached by the page's permission hook.
  return client.prefetchQuery({ queryKey: ['auth', 'me'], queryFn: async () => me(perms) });
}
const row = (name: string) => screen.getAllByText(name)[0]?.closest('tr') as HTMLElement;

describe('RolesPage', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('lists name, base role, system badge and user count', async () => {
    await renderPage([ADMIN, CLERK]);
    await screen.findByText('محاسب');
    expect(within(row('مدير')).getByText(t.roles.type.system)).toBeTruthy();
    expect(within(row('مدير')).getByText('2')).toBeTruthy();
    expect(within(row('محاسب')).getByText(t.roles.type.custom)).toBeTruthy();
    expect(within(row('محاسب')).getAllByText(t.roles.base.admin).length).toBeGreaterThan(0);
  });

  it('system roles have no delete button; custom roles do', async () => {
    await renderPage([ADMIN, CLERK]);
    await screen.findByText('محاسب');
    expect(within(row('مدير')).queryByRole('button', { name: /حذف/ })).toBeNull();
    expect(within(row('محاسب')).getByRole('button', { name: t.roles.action.deleteRole.replace('{name}', 'محاسب') })).toBeTruthy();
  });

  it('delete is blocked with the count when users still hold the role', async () => {
    await renderPage([BUSY]);
    fireEvent.click(await screen.findByRole('button', { name: t.roles.action.deleteRole.replace('{name}', 'مراجع') }));
    expect(screen.getByRole('alert').textContent).toBe(t.roles.delete.blocked.replace('{count}', '3'));
    expect(screen.queryByRole('button', { name: t.roles.action.confirmDelete })).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('deletes an empty custom role after confirming', async () => {
    apiSend.mockResolvedValue(undefined);
    await renderPage([CLERK]);
    fireEvent.click(await screen.findByRole('button', { name: t.roles.action.deleteRole.replace('{name}', 'محاسب') }));
    fireEvent.click(screen.getByRole('button', { name: t.roles.action.confirmDelete }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/roles/r1'));
    await screen.findByText(t.roles.toast.deleted);
  });

  it('shows the API conflict message when the server refuses the delete', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { message: 'role_has_users', count: 5 }));
    await renderPage([CLERK]);
    fireEvent.click(await screen.findByRole('button', { name: t.roles.action.deleteRole.replace('{name}', 'محاسب') }));
    fireEvent.click(screen.getByRole('button', { name: t.roles.action.confirmDelete }));
    await screen.findByText(t.roles.delete.blocked.replace('{count}', '5'));
  });

  it('duplicates a role with the localised copy names', async () => {
    apiSend.mockResolvedValue({ ...CLERK, id: 'r9' });
    await renderPage([CLERK]);
    fireEvent.click(await screen.findByRole('button', { name: t.roles.action.duplicateRole.replace('{name}', 'محاسب') }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/roles/r1/duplicate', { name_ar: t.roles.copyName.replace('{name}', 'محاسب'), name_en: 'Clerk (copy)' }),
    );
    await screen.findByText(t.roles.toast.duplicated);
  });

  it('creates a role: validates, then posts the matrix selection', async () => {
    apiSend.mockResolvedValue({ ...CLERK, id: 'new' });
    await renderPage([ADMIN]);
    fireEvent.click(await screen.findByRole('button', { name: t.roles.newRole }));
    fireEvent.click(screen.getByRole('button', { name: t.roles.action.create }));
    expect(apiSend).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(new RegExp(t.roles.form.nameAr)), { target: { value: 'مراجع حسابات' } });
    fireEvent.change(screen.getByLabelText(new RegExp(t.roles.form.nameEn)), { target: { value: 'Auditor' } });
    fireEvent.click(screen.getByRole('checkbox', { name: t.roles.perm.payments.view }));
    fireEvent.click(screen.getByRole('button', { name: t.roles.action.create }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/roles', {
        key: 'auditor', name_ar: 'مراجع حسابات', name_en: 'Auditor', base_role: 'admin', permissions: ['payments.view'],
      }),
    );
  });

  it('a system role cannot change key or base role, and the admin matrix is locked', async () => {
    await renderPage([ADMIN]);
    fireEvent.click(await screen.findByRole('button', { name: t.roles.action.editRole.replace('{name}', 'مدير') }));
    expect((screen.getByLabelText(new RegExp(t.roles.form.key)) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(new RegExp(t.roles.form.baseRole)) as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox', { name: t.roles.perm.roles.manage }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(t.roles.notes.systemLocked)).toBeTruthy();
  });

  it('without roles.manage there is no create, duplicate or delete', async () => {
    await renderPage([CLERK], ['roles.view']);
    await screen.findByText('محاسب');
    expect(screen.queryByRole('button', { name: t.roles.newRole })).toBeNull();
    expect(screen.queryByRole('button', { name: /حذف|نسخ/ })).toBeNull();
  });
});
