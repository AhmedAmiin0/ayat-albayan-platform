import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { signIn } from './sign-in';

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockApiFetch = jest.fn();

jest.mock('@/core/lib/http/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (c: unknown) => mockSignInWithPassword(c),
      signOut: () => mockSignOut(),
    },
  },
}));
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));

const creds = { identifier: 'a@b.c', password: 'x' };

beforeEach(() => jest.clearAllMocks());

test('wrong password shows Arabic error', async () => {
  mockSignInWithPassword.mockResolvedValue({ error: new Error('bad') });
  expect(await signIn(creds)).toEqual({ ok: false, error: t.auth.invalidCredentials });
  expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'x' });
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('GoTrue rate limit (429) says to wait', async () => {
  mockSignInWithPassword.mockResolvedValue({ error: { status: 429 } });
  expect(await signIn(creds)).toEqual({ ok: false, error: t.familyAuth.errors.too_many_requests });
});

test.each([['guardian'], ['student']])('role %s is told this app is not theirs', async (role) => {
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockApiFetch.mockResolvedValue({ role });
  expect(await signIn(creds)).toEqual({ ok: false, error: t.mobileRoles.wrongApp });
  expect(mockSignOut).toHaveBeenCalled();
});

test.each([[null], ['mystery']])('role %s (no role at all) keeps the not-activated message', async (role) => {
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockApiFetch.mockResolvedValue({ role });
  expect(await signIn(creds)).toEqual({ ok: false, error: t.auth.noRole });
  expect(mockSignOut).toHaveBeenCalled();
});

test('a disabled account (403 account_disabled) says so and signs out', async () => {
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockApiFetch.mockRejectedValue(new ApiError(403, { code: 'account_disabled' }));
  expect(await signIn(creds)).toEqual({ ok: false, error: t.mobileNav.accountDisabled });
  expect(mockSignOut).toHaveBeenCalled();
});

test('role check failing (offline) signs out again with the common error', async () => {
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockApiFetch.mockRejectedValue(new TypeError('Network request failed'));
  expect(await signIn(creds)).toEqual({ ok: false, error: t.common.error });
  expect(mockSignOut).toHaveBeenCalled();
});

test.each([['admin'], ['teacher'], ['sales'], ['assistant']])('%s signs in', async (role) => {
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockApiFetch.mockResolvedValue({ role });
  expect(await signIn(creds)).toEqual({ ok: true });
  expect(mockSignOut).not.toHaveBeenCalled();
});
