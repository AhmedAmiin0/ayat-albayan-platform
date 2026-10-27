import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { LoginPage } from './LoginPage';

const signIn = vi.hoisted(() => vi.fn());
vi.mock('./sign-in', () => ({ signIn, signInWithCode: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  it('renders Arabic labels from i18n', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: t.auth.loginTitle })).toBeTruthy();
    expect(screen.getByLabelText(t.auth.email)).toBeTruthy();
    expect(screen.getByLabelText(t.auth.password)).toBeTruthy();
    expect(screen.getByText(t.auth.intro)).toBeTruthy();
    expect(screen.getByText(t.auth.guardiansNote)).toBeTruthy();
  });

  it('blank «دخول»: Arabic field errors, no browser bubble, no sign-in', async () => {
    signIn.mockReset();
    renderPage();
    expect(screen.getByLabelText(t.auth.email).closest('form')?.noValidate).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: t.auth.submit }));
    await waitFor(() => expect(screen.getAllByText(t.common.required)).toHaveLength(2));
    expect(screen.getByLabelText(t.auth.password).getAttribute('aria-invalid')).toBe('true');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('«إظهار» toggles the password text (aria-pressed)', () => {
    renderPage();
    const input = screen.getByLabelText(t.auth.password);
    const toggle = screen.getByRole('button', { name: t.auth.showPassword });
    expect(input.getAttribute('type')).toBe('password');
    fireEvent.click(toggle);
    expect(input.getAttribute('type')).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows the error returned by signIn', async () => {
    signIn.mockResolvedValue({ ok: false, error: t.auth.invalidCredentials });
    renderPage();
    fireEvent.change(screen.getByLabelText(t.auth.email), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText(t.auth.password), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: t.auth.submit }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.auth.invalidCredentials));
  });
});
