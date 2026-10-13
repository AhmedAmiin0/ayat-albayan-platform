import { GRANTABLE_PERMISSIONS, type RoleView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { RolesPage } from './RolesPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const P = t.permissions.page;
const ADMIN: RoleView = {
  id: 'sys-admin', key: 'admin', name_ar: 'مدير النظام', name_en: null, base_role: 'admin', is_system: true,
  permissions: [...GRANTABLE_PERMISSIONS], users: 1,
};
const SALES: RoleView = { ...ADMIN, id: 'sys-sales', key: 'sales', name_ar: 'المبيعات', base_role: 'sales', permissions: ['inbox.read'] };
const CUSTOM: RoleView = { ...ADMIN, id: 'c-1', key: 'custom-1234abcd', name_ar: 'محاسب', is_system: false, permissions: ['payments.read'] };
const CHECK = 'students.check_registration' as const;

function openRole(name: string) {
  apiFetch.mockImplementation(async (path: string) => (path === '/roles/staff-users' ? [] : [ADMIN, SALES, CUSTOM]));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RolesPage />
    </QueryClientProvider>,
  );
  return screen.findByRole('button', { name: `${P.edit} ${name}` }).then((b) => {
    fireEvent.click(b);
    return within(screen.getByRole('dialog', { name: P.editRole }));
  });
}

describe('RolesPage «استعادة الافتراضي»', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a system sales role is editable, says so, and offers the reset', async () => {
    const dialog = await openRole('المبيعات');
    expect(dialog.getByText(P.systemEditable)).toBeTruthy();
    expect(dialog.getByRole('button', { name: P.reset })).toBeTruthy();
    const box = dialog.getByRole('checkbox', { name: t.permissions.items[CHECK] });
    expect(box).toHaveProperty('disabled', false);
    expect(box.getAttribute('aria-describedby')).toBeTruthy();
    expect(dialog.getByText(t.permissions.hints[CHECK])).toBeTruthy();
  });

  it('no reset for the system admin nor a custom role', async () => {
    const admin = await openRole('مدير النظام');
    expect(admin.queryByRole('button', { name: P.reset })).toBeNull();
    expect(admin.queryByText(P.systemEditable)).toBeNull();
    fireEvent.click(admin.getByRole('button', { name: P.cancel }));
    fireEvent.click(screen.getByRole('button', { name: `${P.edit} محاسب` }));
    const custom = within(screen.getByRole('dialog', { name: P.editRole }));
    expect(custom.queryByRole('button', { name: P.reset })).toBeNull();
  });

  it('asks first, posts the reset, refreshes the roles and shows the defaults', async () => {
    const dialog = await openRole('المبيعات');
    apiSend.mockResolvedValue({ ...SALES, permissions: ['inbox.read', CHECK] });
    fireEvent.click(dialog.getByRole('button', { name: P.reset }));
    expect(apiSend).not.toHaveBeenCalled();
    const calls = apiFetch.mock.calls.length;
    fireEvent.click(dialog.getByRole('button', { name: P.resetConfirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/roles/sys-sales/reset'));
    expect(await screen.findByText(P.resetDone)).toBeTruthy();
    expect(apiFetch.mock.calls.length).toBeGreaterThan(calls);
    expect(dialog.getByRole('checkbox', { name: t.permissions.items[CHECK] })).toHaveProperty('checked', true);
  });

  it('shows the API refusal', async () => {
    const dialog = await openRole('المبيعات');
    const { ApiError } = await import('@/lib/api');
    apiSend.mockRejectedValue(new ApiError(400, { code: 'not_system_role' }));
    fireEvent.click(dialog.getByRole('button', { name: P.reset }));
    fireEvent.click(dialog.getByRole('button', { name: P.resetConfirm }));
    expect(await dialog.findByText(P.errors.not_system_role)).toBeTruthy();
  });
});
