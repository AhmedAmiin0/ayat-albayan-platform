import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { AccountSetupPage } from './AccountSetupPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const search = vi.hoisted((): { value: Record<string, unknown> } => ({ value: {} }));
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend }));
vi.mock('@/lib/http/supabase', () => ({ supabase: { auth } }));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useSearch: () => search.value,
}));
vi.mock('@/features/people/auth/sign-in', () => ({ signOut: vi.fn() }));

const S = t.teacherAuth.setup;
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AccountSetupPage />
    </QueryClientProvider>,
  );
}

describe('/account-setup «أكمل حسابك» (docs/46 A4, A6)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    search.value = {};
    auth.signInWithPassword.mockResolvedValue({ error: null });
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    apiFetch.mockResolvedValue({
      id: 'u1',
      role: 'teacher',
      email: 'teacher@example.com',
      permissions: [],
    });
  });

  it('sends email + password, refreshes the session (the JWT email), then opens the teacher home', async () => {
    apiSend.mockResolvedValue(undefined);
    renderPage();
    type(S.email, ' teacher@example.com ');
    type(S.password, 'Long-enough-1');
    type(S.confirm, 'Long-enough-1');
    fireEvent.click(screen.getByRole('button', { name: S.submit }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ href: '/teacher' }));
    expect(apiSend).toHaveBeenCalledWith('PUT', '/me/setup', {
      email: 'teacher@example.com',
      password: 'Long-enough-1',
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'teacher@example.com',
      password: 'Long-enough-1',
    });
  });

  it('?redirect=<the report link>: lands on that page once set up (owner 2026-11-14)', async () => {
    apiSend.mockResolvedValue(undefined);
    search.value = { redirect: '/teacher/report/L1' };
    renderPage();
    type(S.email, 'teacher@example.com');
    type(S.password, 'Long-enough-1');
    type(S.confirm, 'Long-enough-1');
    fireEvent.click(screen.getByRole('button', { name: S.submit }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ href: '/teacher/report/L1' }));
  });

  it('a bad form sends nothing; an API refusal is shown in words', async () => {
    renderPage();
    type(S.email, 'nope');
    fireEvent.click(screen.getByRole('button', { name: S.submit }));
    expect(screen.getByText(S.errors.invalid_email)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, body: { code: 'email_taken' } }),
    );
    type(S.email, 'taken@example.com');
    type(S.password, 'Long-enough-1');
    type(S.confirm, 'Long-enough-1');
    fireEvent.click(screen.getByRole('button', { name: S.submit }));
    expect(await screen.findByText(S.errors.email_taken)).toBeTruthy();
  });
});
