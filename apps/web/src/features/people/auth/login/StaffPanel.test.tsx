import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { StaffPanel } from './StaffPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend }));
vi.mock('@/features/people/auth/sign-in', () => ({ signIn: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const F = t.familyAuth;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StaffPanel />
    </QueryClientProvider>,
  );
}

describe('StaffPanel «نسيت كلمة المرور؟» (docs/30 §4)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset().mockResolvedValue(undefined);
  });

  it('codes off: the admin resets it; back returns to the sign-in form', async () => {
    apiFetch.mockResolvedValue({ available: false });
    renderPanel();
    click(F.forgot);
    expect(await screen.findByText(F.staffResetByAdmin)).toBeTruthy();
    expect(screen.queryByLabelText(F.identifier)).toBeNull();
    click(F.backToLogin);
    expect(screen.getByLabelText(t.auth.email)).toBeTruthy();
  });

  it('codes on: the reset flow, then «حُفظت كلمة المرور» above the sign-in form', async () => {
    apiFetch.mockResolvedValue({ available: true });
    renderPanel();
    click(F.forgot);
    await screen.findByLabelText(F.identifier);
    type(F.identifier, 'admin@ab.local');
    click(F.sendCode);
    await screen.findByRole('status');
    fireEvent.paste(screen.getByLabelText(F.codeDigit.replace('{n}', '1')), { clipboardData: { getData: () => '123456' } });
    type(F.newPassword, 'new-secret-1');
    type(F.confirmPassword, 'new-secret-1');
    click(F.savePassword);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(F.passwordSaved));
    expect(screen.getByLabelText(t.auth.email)).toBeTruthy();
  });
});
