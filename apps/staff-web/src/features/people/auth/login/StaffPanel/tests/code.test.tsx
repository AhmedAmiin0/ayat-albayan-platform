import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { StaffPanel } from '@/features/people/auth/login/StaffPanel/StaffPanel';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', () => ({
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@ab/web-kit/auth/sign-in/sign-in', () => ({ signIn: vi.fn(), signInWithCode: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), useSearch: () => ({}) }));

const T = t.teacherAuth;

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StaffPanel />
    </QueryClientProvider>,
  );
}

describe('StaffPanel «الدخول برمز واتساب» (docs/46 A6)', () => {
  beforeEach(() => {
    mockApi.reset('read');
    mockApi.reset('write');
    mockApi.onWrite(() => undefined);
  });

  it('shows the link while staff codes can be sent, even with the family flag off', async () => {
    mockApi.onRead(() => ({ available: false, staff: true }));
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: T.withCode }));
    expect(screen.getByText(T.codeIntro)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.familyAuth.phone), {
      target: { value: '+966500000005' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.familyAuth.sendCode }));
    await waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: '/auth/staff-code/request',
        body: {
          phone: '+966500000005',
        },
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: t.familyAuth.changePhone }));
    fireEvent.click(screen.getByRole('button', { name: T.withPassword }));
    expect(screen.getByLabelText(t.auth.email)).toBeTruthy();
  });

  it('no link while staff codes are off', async () => {
    mockApi.onRead(() => ({ available: true, staff: false }));
    renderPanel();
    await waitFor(() => expect(mockApi.reads()).not.toHaveLength(0));
    expect(screen.getByRole('button', { name: t.familyAuth.forgot })).toBeTruthy();
    expect(screen.queryByRole('button', { name: T.withCode })).toBeNull();
  });
});

describe('the teacher code tab speaks for teachers (review)', () => {
  it('a 503 at verify says the teacher text, not the family one', async () => {
    const { signInWithCode } = await import('@ab/web-kit');
    vi.mocked(signInWithCode).mockResolvedValue({
      ok: false,
      error: t.familyAuth.errors.codes_unavailable,
    });
    mockApi.onRead(() => ({ available: false, staff: true }));
    mockApi.onWrite(() => undefined);
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: T.withCode }));
    fireEvent.change(screen.getByLabelText(t.familyAuth.phone), {
      target: { value: '+966500000005' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.familyAuth.sendCode }));
    const first = await screen.findByLabelText(t.familyAuth.codeDigit.replace('{n}', '1'));
    fireEvent.paste(first, { clipboardData: { getData: () => '123456' } });
    fireEvent.click(screen.getByRole('button', { name: t.familyAuth.verify }));
    expect(await screen.findByText(T.codesUnavailable)).toBeTruthy();
  });
});
