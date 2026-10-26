import type { RoleView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { RolesPage } from './RolesPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

// The system guardian / student roles: the family portal's grants are fixed (the API answers 400
// portal_role_fixed), so the dialog locks the matrix and a rename sends the names only.
const P = t.permissions.page;
const GUARDIAN: RoleView = {
  id: 'sys-guardian', key: 'guardian', name_ar: 'ولي الأمر', name_en: null, base_role: 'guardian', is_system: true,
  permissions: [], users: 0,
};

async function openGuardian() {
  apiFetch.mockImplementation(async (path: string) => (path === '/roles/staff-users' ? [] : [GUARDIAN]));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RolesPage />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: `${P.edit} ولي الأمر` }));
  return within(screen.getByRole('dialog', { name: P.editRole }));
}

describe('RolesPage — system guardian / student roles', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('locks the matrix, says why, and offers no reset', async () => {
    const dialog = await openGuardian();
    expect(dialog.getByText(P.portalFixed)).toBeTruthy();
    expect(dialog.getAllByRole('checkbox').every((b) => (b as HTMLInputElement).disabled)).toBe(true);
    expect(dialog.queryByRole('button', { name: P.reset })).toBeNull();
  });

  it('a rename sends the names without permissions', async () => {
    const dialog = await openGuardian();
    apiSend.mockResolvedValue({ ...GUARDIAN, name_ar: 'الأسرة' });
    fireEvent.change(dialog.getByLabelText(P.nameAr, { exact: false }), { target: { value: 'الأسرة' } });
    fireEvent.click(dialog.getByRole('button', { name: P.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    const body: unknown = apiSend.mock.calls[0]?.[2];
    expect(body).toEqual({ name_ar: 'الأسرة', name_en: null });
  });
});
