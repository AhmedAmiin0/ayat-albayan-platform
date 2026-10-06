import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { UsersPage } from './UsersPage';
import { fakeApi, granted, renderWithClient } from './users-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [...granted], can: (p: string) => granted.has(p) }) }));

const lastListPath = () => apiFetch.mock.calls.map((c) => String(c[0])).filter((p) => p.startsWith('/users?')).at(-1) ?? '';

describe('UsersPage «المستخدمون»', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(fakeApi());
    apiSend.mockReset();
    granted.clear();
    granted.add('users.read');
    granted.add('users.write');
  });

  it('lists users with role, linked record and status, asking for page 1', async () => {
    renderWithClient(<UsersPage />);
    expect(await screen.findByRole('button', { name: 'سارة أحمد' })).toBeTruthy();
    expect(screen.getByText('sara@ab.co')).toBeTruthy();
    expect(screen.getAllByText('AB-0007').length).toBeGreaterThan(0);
    expect(screen.getByText(t.users.status.disabled)).toBeTruthy();
    expect(screen.getAllByText(t.users.never).length).toBeGreaterThan(0);
    expect(screen.getByText(t.users.count.replace('{n}', '2'))).toBeTruthy();
    expect(lastListPath()).toBe('/users?page=1&pageSize=20');
  });

  it('role and status filters go to the API and show as chips', async () => {
    renderWithClient(<UsersPage />);
    await screen.findByRole('button', { name: 'سارة أحمد' });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.table.filter) }));
    const panel = await screen.findByRole('dialog');
    fireEvent.change(within(panel).getByLabelText(t.users.filters.role), { target: { value: 'student' } });
    await waitFor(() => expect(lastListPath()).toContain('role=student'));
    fireEvent.change(within(panel).getByLabelText(t.users.filters.status), { target: { value: 'disabled' } });
    await waitFor(() => expect(lastListPath()).toContain('status=disabled'));
    expect(lastListPath()).toContain('page=1');
  });

  it('searches by text after a short pause', async () => {
    renderWithClient(<UsersPage />);
    await screen.findByRole('button', { name: 'سارة أحمد' });
    fireEvent.change(screen.getByRole('textbox', { name: t.common.search }), { target: { value: 'sara' } });
    await waitFor(() => expect(lastListPath()).toContain('q=sara'));
  });

  it('opens «مستخدم جديد» for users.write', async () => {
    renderWithClient(<UsersPage />);
    fireEvent.click(await screen.findByRole('button', { name: t.users.new }));
    expect(screen.getByRole('dialog', { name: t.users.create.title })).toBeTruthy();
  });

  it('hides «مستخدم جديد» without users.write', async () => {
    granted.delete('users.write');
    renderWithClient(<UsersPage />);
    await screen.findByRole('button', { name: 'سارة أحمد' });
    expect(screen.queryByRole('button', { name: t.users.new })).toBeNull();
  });
});
