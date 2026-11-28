import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import {
  domainError,
  PROFILE,
  renderWithClient,
  section,
} from '@/features/people/account/account-test-kit';
import { AccountPage } from '@/features/people/account/AccountPage';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() => {
  mockApi.reset('read');
  mockApi.onRead(() => PROFILE);
  mockApi.reset('write');
});

const W = t.account.password;
async function passwordSection() {
  renderWithClient(<AccountPage />);
  await screen.findByRole('region', { name: W.title });
  const s = section(W.title);
  const type = (current: string, next: string, confirm = next) => {
    fireEvent.change(s.getByLabelText(t.account.currentPassword), { target: { value: current } });
    fireEvent.change(s.getByLabelText(W.new), { target: { value: next } });
    fireEvent.change(s.getByLabelText(W.confirm), { target: { value: confirm } });
    fireEvent.click(s.getByRole('button', { name: t.account.save }));
  };
  return { s, type };
}

describe('PasswordSection (R-ACC-04)', () => {
  it('the new password fields ask the browser for a new password', async () => {
    const { s } = await passwordSection();
    expect(s.getByLabelText(W.new).getAttribute('autocomplete')).toBe('new-password');
    expect(s.getByLabelText(t.account.currentPassword).getAttribute('autocomplete')).toBe(
      'current-password',
    );
  });

  it('a mismatch is caught here, at the confirmation', async () => {
    const { s, type } = await passwordSection();
    type('old-pass', 'new-pass-1', 'new-pass-2');
    expect(s.getByText(W.mismatch)).toBeTruthy();
    expect(s.getByLabelText(W.confirm).getAttribute('aria-invalid')).toBe('true');
    expect(mockApi.writes()).toHaveLength(0);
  });

  it('400 wrong_password shows at the current password', async () => {
    const { s, type } = await passwordSection();
    mockApi.onWrite(() => Promise.reject(domainError(400, 'wrong_password')));
    type('bad-pass', 'new-pass-1');
    expect(await s.findByText(t.account.errors.wrong_password)).toBeTruthy();
    expect(s.getByLabelText(t.account.currentPassword).getAttribute('aria-invalid')).toBe('true');
  });

  it('a change: PUT /me/password, a toast, and the fields are emptied', async () => {
    const { s, type } = await passwordSection();
    mockApi.onWrite(() => undefined);
    type('old-pass', 'new-pass-1');
    expect(await screen.findByText(t.account.toast.password)).toBeTruthy();
    expect(mockApi.writes()).toContainEqual({
      method: 'PUT',
      path: '/me/password',
      body: { current_password: 'old-pass', new_password: 'new-pass-1' },
    });
    expect(s.getByLabelText<HTMLInputElement>(W.new).value).toBe('');
  });
});
