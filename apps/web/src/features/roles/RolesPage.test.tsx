import { GRANTABLE_PERMISSIONS, type RoleView, type StaffUserView } from '@ab/shared';
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
const TEACHER: RoleView = { ...ADMIN, id: 'sys-teacher', key: 'teacher', name_ar: 'معلم/ة', base_role: 'teacher', permissions: ['reports.write'] };
const GUARDIAN: RoleView = { ...ADMIN, id: 'sys-guardian', key: 'guardian', name_ar: 'ولي الأمر', base_role: 'guardian', permissions: [] };
const USERS: StaffUserView[] = [{ id: 'u2', full_name: 'سارة', role: 'teacher', role_id: 'sys-teacher' }];

function renderPage() {
  apiFetch.mockImplementation(async (path: string) => (path === '/roles/staff-users' ? USERS : [ADMIN, TEACHER, GUARDIAN]));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RolesPage />
    </QueryClientProvider>,
  );
}

describe('RolesPage «الأدوار والصلاحيات»', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('lists roles (system ones marked) and staff users with a role selector', async () => {
    renderPage();
    expect((await screen.findAllByText('مدير النظام')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(P.system).length).toBeGreaterThan(0);
    const select = await screen.findByRole('combobox', { name: `${P.role}: سارة` });
    expect(within(select).queryByText('ولي الأمر')).toBeNull();
    apiSend.mockResolvedValue(USERS[0]);
    fireEvent.change(select, { target: { value: 'sys-admin' } });
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/users/u2/role', { role_id: 'sys-admin' }));
  });

  it('creates a role «محاسب» with «تحديد الكل» on finance, then saves it', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: P.newRole }));
    const dialog = screen.getByRole('dialog', { name: P.newRole });
    fireEvent.change(within(dialog).getByLabelText(new RegExp(P.nameAr)), { target: { value: 'محاسب' } });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: `${P.selectAll}: ${t.permissions.areas.finance}` }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: t.permissions.items['payments.write'] }));
    apiSend.mockResolvedValue({ ...TEACHER, id: 'new' });
    fireEvent.click(screen.getByRole('button', { name: P.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    const [method, path, body] = apiSend.mock.calls[0] ?? [];
    expect([method, path]).toEqual(['POST', '/roles']);
    expect(body).toMatchObject({ name_ar: 'محاسب', base_role: 'admin' });
    expect(body.permissions).toContain('payments.read');
    expect(body.permissions).not.toContain('payments.write');
  });

  it('shows the system admin’s matrix ticked and locked', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: `${P.edit} مدير النظام` }));
    const dialog = screen.getByRole('dialog', { name: P.editRole });
    const box = within(dialog).getByRole('checkbox', { name: t.permissions.items['students.read'] });
    expect(box).toHaveProperty('checked', true);
    expect(box).toHaveProperty('disabled', true);
    expect(within(dialog).queryByRole('button', { name: P.delete })).toBeNull();
  });

  it('requires an Arabic name', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: P.newRole }));
    fireEvent.click(screen.getByRole('button', { name: P.save }));
    expect(await screen.findByText(P.nameRequired)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
