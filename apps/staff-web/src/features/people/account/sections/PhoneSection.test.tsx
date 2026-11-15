import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { domainError, invalid, PROFILE, renderWithClient, section } from '@/features/people/account/account-test-kit';
import { AccountPage } from '@/features/people/account/AccountPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

beforeEach(() => {
  apiFetch.mockReset().mockResolvedValue(PROFILE);
  apiSend.mockReset();
});

const P = t.account.phone;
const E = t.account.errors;
async function phoneSection() {
  renderWithClient(<AccountPage />);
  await screen.findByRole('region', { name: P.title });
  const s = section(P.title);
  const type = (phone: string, password: string) => {
    fireEvent.change(s.getByLabelText(P.label), { target: { value: phone } });
    fireEvent.change(s.getByLabelText(t.account.currentPassword), { target: { value: password } });
    fireEvent.click(s.getByRole('button', { name: t.account.save }));
  };
  return { s, type };
}

describe('PhoneSection (R-ACC-02)', () => {
  it('the number is LTR; a saved change is sent as E.164 with the current password', async () => {
    const { s, type } = await phoneSection();
    expect(s.getByLabelText(P.label).getAttribute('dir')).toBe('ltr');
    apiSend.mockResolvedValue({ ...PROFILE, phone_e164: '+966501234567' });
    type('0501234567', 'secret-1');
    expect(await screen.findByText(t.account.toast.phone)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/me/profile', { phone_e164: '+966501234567', current_password: 'secret-1' });
  });

  it('409 phone_taken shows at the number', async () => {
    const { s, type } = await phoneSection();
    apiSend.mockRejectedValue(domainError(409, 'phone_taken'));
    type('+966501234567', 'secret-1');
    expect(await s.findByText(E.phone_taken)).toBeTruthy();
    expect(s.getByLabelText(P.label).getAttribute('aria-invalid')).toBe('true');
  });

  it('400 wrong_password shows at the current password', async () => {
    const { s, type } = await phoneSection();
    apiSend.mockRejectedValue(domainError(400, 'wrong_password'));
    type('+966501234567', 'nope');
    expect(await s.findByText(E.wrong_password)).toBeTruthy();
    expect(s.getByLabelText(t.account.currentPassword).getAttribute('aria-invalid')).toBe('true');
  });

  it('a phone reason from validation_failed reads as invalid_phone', async () => {
    const { s, type } = await phoneSection();
    apiSend.mockRejectedValue(invalid('phone_e164', 'invalid_length'));
    type('+966501234567', 'secret-1');
    expect(await s.findByText(E.invalid_phone)).toBeTruthy();
  });

  it('checked here first: a bad number and a missing password', async () => {
    const { s, type } = await phoneSection();
    type('abc', '');
    expect(s.getByText(E.invalid_phone)).toBeTruthy();
    expect(s.getByText(E.password_required)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('«إزالة الرقم» empties the field; saving sends null', async () => {
    const { s, type } = await phoneSection();
    fireEvent.click(s.getByRole('button', { name: P.remove }));
    apiSend.mockResolvedValue({ ...PROFILE, phone_e164: null });
    type('', 'secret-1');
    expect(await screen.findByText(t.account.toast.phone)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/me/profile', { phone_e164: null, current_password: 'secret-1' });
  });
});
