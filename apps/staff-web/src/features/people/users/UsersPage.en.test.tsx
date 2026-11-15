import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UsersPage } from './UsersPage';
import { fakeApi, granted, renderWithClient } from './users-test-kit';

vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }) }));

describe('UsersPage, English', () => {
  it('title, action, role and status read in English', async () => {
    granted.add('users.write');
    apiFetch.mockImplementation(fakeApi());
    renderWithClient(<UsersPage />);
    expect(await screen.findByRole('button', { name: 'New user' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeTruthy();
    expect(await screen.findByText('Disabled')).toBeTruthy();
    expect(screen.getAllByText('Student').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Never signed in').length).toBeGreaterThan(0);
  });
});
