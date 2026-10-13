import ar from '@ab/shared/i18n/ar.json';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOGIN_TEXT, PAGE_TEXT, quietExpectedErrors, renderFailingSection } from './app-error.test-utils';

const E = ar.auth.appError;
const signOut = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@/features/auth/sign-in', () => ({ signOut }));
const stored = vi.hoisted(() => ({ session: true }));
vi.mock('@/features/auth/end-session', () => ({ hasStoredSession: () => stored.session }));

const apiDown = (): Promise<void> => Promise.reject(new Error('API 500'));

beforeEach(() => {
  signOut.mockClear();
  stored.session = true;
  quietExpectedErrors();
});

describe('the app error screen (root errorComponent)', () => {
  it('a failing section guard shows the Arabic screen, not the router’s English box', async () => {
    renderFailingSection(apiDown);
    expect(await screen.findByRole('heading', { name: E.title })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(E.body);
    expect(screen.getByRole('button', { name: E.retry })).toBeTruthy();
    expect(screen.getByRole('button', { name: ar.auth.logout })).toBeTruthy();
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });

  it('«إعادة المحاولة» runs the guard again and opens the page once it passes', async () => {
    const guard = vi.fn(async (): Promise<void> => undefined).mockImplementationOnce(apiDown);
    renderFailingSection(guard);
    fireEvent.click(await screen.findByRole('button', { name: E.retry }));
    expect(await screen.findByText(PAGE_TEXT)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: E.title })).toBeNull();
    expect(guard).toHaveBeenCalledTimes(2);
  });

  it('«إعادة المحاولة» keeps the screen while the guard still fails', async () => {
    const guard = vi.fn(apiDown);
    renderFailingSection(guard);
    fireEvent.click(await screen.findByRole('button', { name: E.retry }));
    await vi.waitFor(() => expect(guard).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: E.retry })).toBeTruthy();
    expect(screen.queryByText(PAGE_TEXT)).toBeNull();
  });

  it('«تسجيل الخروج» signs this browser out and opens /login', async () => {
    const { queryClient } = renderFailingSection(apiDown);
    fireEvent.click(await screen.findByRole('button', { name: ar.auth.logout }));
    expect(await screen.findByText(LOGIN_TEXT)).toBeTruthy();
    expect(signOut).toHaveBeenCalledWith(queryClient);
    expect(screen.queryByRole('heading', { name: E.title })).toBeNull();
  });

  it('a public page (no stored session): retry only, and no word about signing in', async () => {
    stored.session = false;
    renderFailingSection(apiDown);
    expect(await screen.findByRole('heading', { name: E.title })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(E.bodyPublic);
    expect(screen.getByRole('button', { name: E.retry })).toBeTruthy();
    expect(screen.queryByRole('button', { name: ar.auth.logout })).toBeNull();
  });
});
