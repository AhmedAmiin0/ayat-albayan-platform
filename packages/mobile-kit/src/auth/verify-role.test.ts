import type { Session } from '@supabase/supabase-js';
import { renderHook } from '@testing-library/react-native';
import { ApiError } from '../lib/http/api';
import { t } from '../lib/i18n/i18n';
import { pathKey } from '../lib/query/query-keys';
import { queryClient } from '../lib/query/query-client';
import { setLoginNotice, useLoginNotice } from './login-notice';
import { verifyRole } from './verify-role';

const mockRead = jest.fn();
const mockSignOut = jest.fn();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  call: (request: unknown) => mockRead(request),
}));
jest.mock('../lib/http/supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));

const claim = (role: string | null) => `h.${btoa(JSON.stringify({ sub: 'u1', user_role: role }))}.s`;
const session = (role: string | null) => ({ access_token: claim(role) }) as Session;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  setLoginNotice(null);
});

/** The notice the login screen would show right now. */
const shownNotice = async () => (await renderHook(useLoginNotice)).result.current;

test.each([['admin'], ['teacher'], ['sales'], ['assistant']])('%s stays in', async (role) => {
  mockRead.mockResolvedValue({ role });
  expect(await verifyRole(session(role))).toBe(role);
  expect(mockRead).toHaveBeenCalledWith({ path: '/auth/me' });
  expect(mockSignOut).not.toHaveBeenCalled();
});

test.each([['guardian'], ['student'], [null]])('role %s is signed out', async (role) => {
  mockRead.mockResolvedValue({ role });
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
});

test.each([[401], [403]])('API %i is signed out, whatever the token claims', async (status) => {
  mockRead.mockRejectedValue(new ApiError(status));
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
});

test('offline or a 5xx trusts the token claim, never assumes admin', async () => {
  mockRead.mockRejectedValueOnce(new TypeError('Network request failed'));
  expect(await verifyRole(session('teacher'))).toBe('teacher');
  mockRead.mockRejectedValueOnce(new ApiError(502));
  expect(await verifyRole(session('admin'))).toBe('admin');
  expect(mockSignOut).not.toHaveBeenCalled();
});

test.each([['admin'], ['teacher'], ['sales'], ['assistant']])('offline, a %s claim opens its own tree', async (role) => {
  mockRead.mockRejectedValue(new TypeError('Network request failed'));
  expect(await verifyRole(session(role))).toBe(role);
  expect(mockSignOut).not.toHaveBeenCalled();
});

test('offline with a guardian or no claim is signed out', async () => {
  mockRead.mockRejectedValue(new TypeError('Network request failed'));
  expect(await verifyRole(session('guardian'))).toBe('out');
  expect(await verifyRole({ access_token: 'not-a-jwt' } as Session)).toBe('out');
  expect(mockSignOut).toHaveBeenCalledTimes(2);
});

test('a guardian is signed out and the login screen is told this app is not theirs', async () => {
  mockRead.mockResolvedValue({ role: 'guardian' });
  expect(await verifyRole(session('guardian'))).toBe('out');
  expect(await shownNotice()).toBe(t.mobileRoles.wrongApp);
});

test('a disabled account (403 account_disabled) is signed out with its reason', async () => {
  mockRead.mockRejectedValue(new ApiError(403, { code: 'account_disabled' }));
  expect(await verifyRole(session('admin'))).toBe('out');
  expect(mockSignOut).toHaveBeenCalled();
  expect(await shownNotice()).toBe(t.mobileNav.accountDisabled);
});

test('the permissions of /auth/me are cached before the tabs first render (no flash of all five)', async () => {
  const me = { role: 'admin', permissions: ['payments.read'] };
  mockRead.mockResolvedValue(me);
  await verifyRole(session('admin'));
  expect(queryClient.getQueryData(pathKey('/auth/me'))).toEqual(me);
});

test('a refused role seeds nothing', async () => {
  mockRead.mockResolvedValue({ role: 'guardian', permissions: [] });
  await verifyRole(session('admin'));
  expect(queryClient.getQueryData(pathKey('/auth/me'))).toBeUndefined();
});
