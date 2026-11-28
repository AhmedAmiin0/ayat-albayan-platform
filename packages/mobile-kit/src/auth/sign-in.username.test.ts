import { ApiError } from '../lib/http/api';
import { t } from '../lib/i18n/i18n';
import { signIn } from './sign-in';
import { mockCall } from '@ab/testing/mock-call';

// docs/30 §5: an identifier without @ signs in through POST /auth/login, then setSession, then the same role check.
const mockSignInWithPassword = jest.fn();
const mockSetSession = jest.fn();
const mockSignOut = jest.fn();
const mockApi = mockCall();

jest.mock('../lib/http/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (c: unknown) => mockSignInWithPassword(c),
      setSession: (s: unknown) => mockSetSession(s),
      signOut: () => mockSignOut(),
    },
  },
}));
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const creds = { identifier: 'sara.t', password: 'pw' };
const session = { access_token: 'at', refresh_token: 'rt', expires_in: 3600, expires_at: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  mockSetSession.mockResolvedValue({ error: null });
});

test('a username signs in through /auth/login, sets the session, then checks the role', async () => {
  mockApi.onWrite(() => session);
  mockApi.onRead(() => ({ role: 'teacher' }));
  expect(await signIn(creds)).toEqual({ ok: true });
  expect(mockApi.writes()).toContainEqual({
    method: 'POST',
    path: '/auth/login',
    body: { username: 'sara.t', password: 'pw' },
  });
  expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/auth/me' });
  expect(mockSignInWithPassword).not.toHaveBeenCalled();
});

test('a username of a family account gets the same wrong-app refusal and is signed out', async () => {
  mockApi.onWrite(() => session);
  mockApi.onRead(() => ({ role: 'guardian' }));
  expect(await signIn(creds)).toEqual({ ok: false, error: t.mobileRoles.wrongApp });
  expect(mockSignOut).toHaveBeenCalled();
});

test.each([
  ['invalid_credentials (401)', new ApiError(401, { code: 'invalid_credentials' })],
  ['offline', new TypeError('Network request failed')],
])('%s reads as wrong credentials, no session', async (_name, error) => {
  mockApi.onWrite(() => Promise.reject(error));
  expect(await signIn(creds)).toEqual({ ok: false, error: t.auth.invalidCredentials });
  expect(mockSetSession).not.toHaveBeenCalled();
  expect(mockApi.reads()).toHaveLength(0);
});

test('429 too_many_requests says to wait', async () => {
  mockApi.onWrite(() => Promise.reject(new ApiError(429, { code: 'too_many_requests' })));
  expect(await signIn(creds)).toEqual({ ok: false, error: t.familyAuth.errors.too_many_requests });
});

test('a session that will not set is refused before the role check', async () => {
  mockApi.onWrite(() => session);
  mockSetSession.mockResolvedValue({ error: new Error('bad jwt') });
  expect(await signIn(creds)).toEqual({ ok: false, error: t.auth.invalidCredentials });
  expect(mockApi.reads()).toHaveLength(0);
});
