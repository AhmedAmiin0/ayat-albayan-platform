import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { FamilyPanel } from './FamilyPanel';
import { mockCall } from '@ab/testing/mock-call';

const auth = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  setSession: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}));
const mockApi = mockCall();
const navigate = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/supabase', () => ({ supabase: { auth } }));
vi.mock('@ab/web-kit/lib/http/api/api', () => ({
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@ab/web-kit/auth/session-activity', () => ({ reportSession: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate, useSearch: () => ({}) }));

const F = t.familyAuth;
const status = (available: boolean | Error) =>
  mockApi.onRead(async ({ path }) => {
    if (path !== '/auth/code/status') return { id: 'g1', role: 'guardian' };
    if (available instanceof Error) throw available;
    return { available };
  });

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FamilyPanel />
    </QueryClientProvider>,
  );
}

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('FamilyPanel (docs/30 §1, §7)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
  });

  it('phone → «أرسل الرمز» → code → verifyOtp → the guardian home', async () => {
    status(true);
    mockApi.onWrite(async ({ method: _m, path }) =>
      path === '/auth/code/verify' ? { token_hash: 'hash', type: 'magiclink' } : undefined,
    );
    auth.verifyOtp.mockResolvedValue({ error: null });
    renderPanel();
    fireEvent.change(await screen.findByLabelText(F.phone), { target: { value: '01001234567' } });
    click(F.sendCode);
    expect((await screen.findByRole('status')).textContent).toBe(F.codeSent);
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/auth/code/request',
      body: { phone: '+201001234567' },
    });
    fireEvent.paste(screen.getByLabelText(F.codeDigit.replace('{n}', '1')), {
      clipboardData: { getData: () => '123456' },
    });
    click(F.verify);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ href: '/portal' }));
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/auth/code/verify',
      body: {
        phone: '+201001234567',
        code: '123456',
      },
    });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'magiclink', token_hash: 'hash' });
  });

  it('a wrong number never asks for a code; an incomplete code is caught before the API', async () => {
    status(true);
    mockApi.onWrite(() => undefined);
    renderPanel();
    fireEvent.change(await screen.findByLabelText(F.phone), { target: { value: '12' } });
    click(F.sendCode);
    expect((await screen.findByRole('alert')).textContent).toBe(F.errors.invalid_phone);
    expect(mockApi.writes()).toHaveLength(0);
    fireEvent.change(screen.getByLabelText(F.phone), { target: { value: '+201001234567' } });
    click(F.sendCode);
    await screen.findByRole('status');
    click(F.verify);
    expect((await screen.findByRole('alert')).textContent).toBe(F.errors.code_incomplete);
    expect(mockApi.writes()).toHaveLength(1);
  });

  it('codes off: only «الدخول للأسر غير متاح بعد», no phone form', async () => {
    status(false);
    renderPanel();
    expect(await screen.findByText(F.familyUnavailable)).toBeTruthy();
    expect(screen.queryByLabelText(F.phone)).toBeNull();
    expect(screen.queryByRole('button', { name: F.firstTime })).toBeNull();
  });

  it('a failed status call counts as unavailable', async () => {
    status(new Error('offline'));
    renderPanel();
    expect(await screen.findByText(F.familyUnavailable)).toBeTruthy();
  });

  it('«الدخول باسم المستخدم»: the student code + password through POST /auth/login', async () => {
    status(true);
    mockApi.onWrite(() => ({
      access_token: 'at',
      refresh_token: 'rt',
      expires_in: 1,
      expires_at: null,
    }));
    auth.setSession.mockResolvedValue({ error: null });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: F.withUsername }));
    expect(screen.getByText(F.studentUsernameHint)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(F.username), { target: { value: 'ab-1234' } });
    fireEvent.change(screen.getByLabelText(t.auth.password), { target: { value: 'secret-123' } });
    click(t.auth.submit);
    await waitFor(() =>
      expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' }),
    );
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/auth/login',
      body: {
        username: 'ab-1234',
        password: 'secret-123',
      },
    });
  });
});
