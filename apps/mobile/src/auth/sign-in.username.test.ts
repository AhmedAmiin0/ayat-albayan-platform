import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { signIn } from './sign-in';

// docs/30 §5: an identifier without @ signs in through POST /auth/login, then setSession, then the same role check.
const mockSignInWithPassword = jest.fn();
const mockSetSession = jest.fn();
const mockSignOut = jest.fn();
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();

jest.mock('@/core/lib/http/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (c: unknown) => mockSignInWithPassword(c),
      setSession: (s: unknown) => mockSetSession(s),
      signOut: () => mockSignOut(),
    },
  },
}));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));

const creds = { identifier: 'sara.t', password: 'pw' };
const session = { access_token: 'at', refresh_token: 'rt', expires_in: 3600, expires_at: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  mockSetSession.mockResolvedValue({ error: null });
});

test('a username signs in through /auth/login, sets the session, then checks the role', async () => {
  mockApiSend.mockResolvedValue(session);
  mockApiFetch.mockResolvedValue({ role: 'teacher' });
  expect(await signIn(creds)).toEqual({ ok: true });
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/login', { username: 'sara.t', password: 'pw' });
  expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
  expect(mockApiFetch).toHaveBeenCalledWith('/auth/me');
  expect(mockSignInWithPassword).not.toHaveBeenCalled();
});

test('a username of a family account gets the same wrong-app refusal and is signed out', async () => {
  mockApiSend.mockResolvedValue(session);
  mockApiFetch.mockResolvedValue({ role: 'guardian' });
  expect(await signIn(creds)).toEqual({ ok: false, error: t.mobileRoles.wrongApp });
  expect(mockSignOut).toHaveBeenCalled();
});

test.each([
  ['invalid_credentials (401)', new ApiError(401, { code: 'invalid_credentials' })],
  ['offline', new TypeError('Network request failed')],
])('%s reads as wrong credentials, no session', async (_name, error) => {
  mockApiSend.mockRejectedValue(error);
  expect(await signIn(creds)).toEqual({ ok: false, error: t.auth.invalidCredentials });
  expect(mockSetSession).not.toHaveBeenCalled();
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('429 too_many_requests says to wait', async () => {
  mockApiSend.mockRejectedValue(new ApiError(429, { code: 'too_many_requests' }));
  expect(await signIn(creds)).toEqual({ ok: false, error: t.familyAuth.errors.too_many_requests });
});

test('a session that will not set is refused before the role check', async () => {
  mockApiSend.mockResolvedValue(session);
  mockSetSession.mockResolvedValue({ error: new Error('bad jwt') });
  expect(await signIn(creds)).toEqual({ ok: false, error: t.auth.invalidCredentials });
  expect(mockApiFetch).not.toHaveBeenCalled();
});
