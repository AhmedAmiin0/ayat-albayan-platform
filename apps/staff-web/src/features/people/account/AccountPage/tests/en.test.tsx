import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PROFILE, renderWithClient } from '@/features/people/account/account-test-kit';
import { AccountPage } from '@/features/people/account/AccountPage/AccountPage';

vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@ab/web-kit/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('AccountPage, English (R-ACC-01)', () => {
  it('title, role (English name), sections, fields and buttons read in English', async () => {
    apiFetch.mockResolvedValue(PROFILE);
    renderWithClient(<AccountPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'My account' })).toBeTruthy();
    expect(await screen.findByText('Role: Quran teacher')).toBeTruthy();
    for (const name of ['Profile photo', 'Name', 'Phone number', 'Email', 'Password']) expect(screen.getByRole('region', { name })).toBeTruthy();
    expect(screen.getByLabelText('Full name')).toBeTruthy();
    expect(screen.getByLabelText('New password')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Save' })).toHaveLength(4);
    expect(screen.getByLabelText('Choose a photo')).toBeTruthy();
  });
});
