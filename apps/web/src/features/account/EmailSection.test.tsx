import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { domainError, PROFILE, renderWithClient, section } from './account-test-kit';
import { AccountPage } from './AccountPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

beforeEach(() => {
  apiFetch.mockReset().mockResolvedValue(PROFILE);
  apiSend.mockReset();
});

const M = t.account.email;
async function emailSection() {
  const r = renderWithClient(<AccountPage />);
  await screen.findByRole('region', { name: M.title });
  const s = section(M.title);
  const type = (email: string, password: string) => {
    fireEvent.change(s.getByLabelText(M.label), { target: { value: email } });
    fireEvent.change(s.getByLabelText(t.account.currentPassword), { target: { value: password } });
    fireEvent.click(s.getByRole('button', { name: t.account.save }));
  };
  return { s, type, invalidate: r.invalidate };
}

describe('EmailSection (R-ACC-03)', () => {
  it('shows the current email as an LTR island; the new one is an LTR input', async () => {
    const { s } = await emailSection();
    const [before = ''] = M.current.split('{email}');
    expect(s.getByText(PROFILE.email ?? '').tagName).toBe('BDI');
    expect(s.getByText(PROFILE.email ?? '').parentElement?.textContent?.startsWith(before)).toBe(true);
    expect(s.getByLabelText(M.label).getAttribute('dir')).toBe('ltr');
  });

  it('a change is sent lower-cased with the password; toast; profile and /auth/me reload', async () => {
    const { s, type, invalidate } = await emailSection();
    apiSend.mockResolvedValue({ ...PROFILE, email: 'new@ab.co' });
    type(' New@AB.co ', 'secret-1');
    expect(await screen.findByText(t.account.toast.email)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('PUT', '/me/email', { email: 'new@ab.co', current_password: 'secret-1' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me', 'profile'] });
    await vi.waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] }));
    expect((s.getByLabelText(M.label) as HTMLInputElement).value).toBe('');
  });

  it('409 email_taken shows at the email', async () => {
    const { s, type } = await emailSection();
    apiSend.mockRejectedValue(domainError(409, 'email_taken'));
    type('taken@ab.co', 'secret-1');
    expect(await s.findByText(t.account.errors.email_taken)).toBeTruthy();
    expect(s.getByLabelText(M.label).getAttribute('aria-invalid')).toBe('true');
  });

  it('400 wrong_password shows at the current password', async () => {
    const { s, type } = await emailSection();
    apiSend.mockRejectedValue(domainError(400, 'wrong_password'));
    type('new@ab.co', 'nope');
    expect(await s.findByText(t.account.errors.wrong_password)).toBeTruthy();
  });
});
