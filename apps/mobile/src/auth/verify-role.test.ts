import type { Session } from '@supabase/supabase-js';
import { renderHook } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { setLoginNotice, useLoginNotice } from './login-notice';
import { verifyRole } from './verify-role';

const mockApiFetch = jest.fn();
const mockSignOut = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));

const claim = (role: string | null) => `h.${btoa(JSON.stringify({ sub: 'u1', user_role: role }))}.s`;
const session = (role: string | null) => ({ access_token: claim(role) }) as Session;

beforeEach(() => {
  jest.clearAllMocks();
  setLoginNotice(null);
});

/** The notice the login screen would show right now. */
const shownNotice = async () => (await renderHook(useLoginNotice)).result.current;

test.each([['admin'], ['teacher']])('%s stays in', async (role) => {
  mockApiFetch.mockResolvedValue({ role });
  expect(await verifyRole(session(role))).toBe(role);
  expect(mockApiFetch).toHaveBeenCalledWith('/auth/me');
  expect(mockSignOut).not.toHaveBeenCalled();
});

test.each([['guardian'], [null]])('role %s is signed out', async (role) => {
  mockApiFetch.mockResolvedValue({ role });
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
});

test.each([[401], [403]])('API %i is signed out, whatever the token claims', async (status) => {
  mockApiFetch.mockRejectedValue(new ApiError(status));
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
});

test('offline or a 5xx trusts the token claim, never assumes admin', async () => {
  mockApiFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
  expect(await verifyRole(session('teacher'))).toBe('teacher');
  mockApiFetch.mockRejectedValueOnce(new ApiError(502));
  expect(await verifyRole(session('admin'))).toBe('admin');
  expect(mockSignOut).not.toHaveBeenCalled();
});

test('offline with a guardian or no claim is signed out', async () => {
  mockApiFetch.mockRejectedValue(new TypeError('Network request failed'));
  expect(await verifyRole(session('guardian'))).toBe('out');
  expect(await verifyRole({ access_token: 'not-a-jwt' } as Session)).toBe('out');
  expect(mockSignOut).toHaveBeenCalledTimes(2);
});

test('a guardian is signed out and the login screen is told this app is not theirs', async () => {
  mockApiFetch.mockResolvedValue({ role: 'guardian' });
  expect(await verifyRole(session('guardian'))).toBe('out');
  expect(await shownNotice()).toBe(t.mobileNav.wrongApp);
});

test('a disabled account (403 account_disabled) is signed out with its reason', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(403, { code: 'account_disabled' }));
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
  expect(await shownNotice()).toBe(t.mobileNav.accountDisabled);
});
