import { t } from '@/lib/i18n';
import { signIn } from './sign-in';

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockApiFetch = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (c: unknown) => mockSignInWithPassword(c),
      signOut: () => mockSignOut(),
    },
  },
}));
jest.mock('@/lib/api', () => ({ apiFetch: (p: string) => mockApiFetch(p) }));

const creds = { email: 'a@b.c', password: 'x' };

beforeEach(() => jest.clearAllMocks());

test('wrong password shows Arabic error', async () => {
  mockSignInWithPassword.mockResolvedValue({ error: new Error('bad') });
  expect(await signIn(creds)).toEqual({ ok: false, error: t.auth.invalidCredentials });
});

test('non-admin is signed out again', async () => {
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockApiFetch.mockResolvedValue({ role: 'teacher' });
  expect(await signIn(creds)).toEqual({ ok: false, error: t.auth.noRole });
  expect(mockSignOut).toHaveBeenCalled();
});

test('admin signs in', async () => {
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockApiFetch.mockResolvedValue({ role: 'admin' });
  expect(await signIn(creds)).toEqual({ ok: true });
});
