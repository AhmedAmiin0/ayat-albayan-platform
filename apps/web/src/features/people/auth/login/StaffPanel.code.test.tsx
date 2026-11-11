import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { StaffPanel } from './StaffPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend }));
vi.mock('@/features/people/auth/sign-in', () => ({ signIn: vi.fn(), signInWithCode: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

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
    apiFetch.mockReset();
    apiSend.mockReset().mockResolvedValue(undefined);
  });

  it('shows the link while staff codes can be sent, even with the family flag off', async () => {
    apiFetch.mockResolvedValue({ available: false, staff: true });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: T.withCode }));
    expect(screen.getByText(T.codeIntro)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.familyAuth.phone), {
      target: { value: '+966500000005' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.familyAuth.sendCode }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/auth/staff-code/request', {
        phone: '+966500000005',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: t.familyAuth.changePhone }));
    fireEvent.click(screen.getByRole('button', { name: T.withPassword }));
    expect(screen.getByLabelText(t.auth.email)).toBeTruthy();
  });

  it('no link while staff codes are off', async () => {
    apiFetch.mockResolvedValue({ available: true, staff: false });
    renderPanel();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: t.familyAuth.forgot })).toBeTruthy();
    expect(screen.queryByRole('button', { name: T.withCode })).toBeNull();
  });
});
