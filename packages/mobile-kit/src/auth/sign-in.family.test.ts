import { t } from '../lib/i18n/i18n';
import { authApi } from './forgot/auth-api';
import { signIn, signInWithCode } from './sign-in';

// docs/50 §6: the family app's sign-in finishes the same way as the staff app's; only the role
// check is the family's (audience).

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
const mockVerifyOtp = jest.fn();
const mockSetSession = jest.fn();
const mockSignOut = jest.fn();
jest.mock('./audience', () => ({ audience: () => 'family' }));
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  call: ({ path }: { path: string }) => mockApiFetch(path),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('../lib/http/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: (b: unknown) => mockVerifyOtp(b),
      setSession: (b: unknown) => mockSetSession(b),
      signOut: () => mockSignOut(),
    },
  },
}));

const tokens = { access_token: 'a', refresh_token: 'r' };
const session = { ...tokens, expires_in: 3600, expires_at: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyOtp.mockResolvedValue({ error: null });
  mockSetSession.mockResolvedValue({ error: null });
});

test('a guardian: the family code routes → verifyOtp with the token hash → in', async () => {
  mockApiSend.mockResolvedValue({ token_hash: 'hash', type: 'magiclink' });
  mockApiFetch.mockResolvedValue({ role: 'guardian' });
  const body = { phone: '+966500000005', code: '123456' };
  expect(await signInWithCode(body, authApi.familyCodes)).toEqual({ ok: true });
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/code/verify', body);
  expect(mockVerifyOtp).toHaveBeenCalledWith({ type: 'magiclink', token_hash: 'hash' });
});

test('a student code + password goes through POST /auth/login and enters', async () => {
  mockApiSend.mockResolvedValue(session);
  mockApiFetch.mockResolvedValue({ role: 'student' });
  expect(await signIn({ identifier: 'AB-1234', password: 'pw' })).toEqual({ ok: true });
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/login', {
    username: 'AB-1234',
    password: 'pw',
  });
  expect(mockSetSession).toHaveBeenCalledWith(tokens);
});

test('a staff login is refused in the family app with the inverted notice', async () => {
  mockApiSend.mockResolvedValue(session);
  mockApiFetch.mockResolvedValue({ role: 'teacher' });
  const res = await signIn({ identifier: 'omar.t', password: 'pw' });
  expect(res).toEqual({ ok: false, error: t.familyApp.wrongApp });
  expect(mockSignOut).toHaveBeenCalled();
});
