import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { quietExpectedErrors, renderFailingSection } from './app-error.test-utils';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
vi.mock('@/features/auth/sign-in', () => ({ signOut: vi.fn(async () => undefined) }));

describe('the app error screen, English', () => {
  it('reads in English', async () => {
    quietExpectedErrors();
    renderFailingSection(() => Promise.reject(new Error('API 500')));
    expect(await screen.findByRole('heading', { name: "This page couldn't open" })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(en.auth.appError.body);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });
});
