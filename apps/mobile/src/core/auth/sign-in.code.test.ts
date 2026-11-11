import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { noticeText } from './login-notice';
import { signInWithCode } from './sign-in';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { auth: { verifyOtp: jest.fn(), signOut: jest.fn() } },
}));

const body = { phone: '+966500000005', code: '123456' };

test.each([
  [503, 'codes_unavailable', t.teacherAuth.codesUnavailable],
  [401, 'invalid_code', t.familyAuth.errors.invalid_code],
  [403, 'account_disabled', noticeText('accountDisabled')],
])("a %s %s from the staff verify is said in the teacher's words", async (status, code, words) => {
  mockApiSend.mockRejectedValue(new ApiError(status, { code }));
  const res = await signInWithCode(body);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/auth/staff-code/verify', body);
  expect(res).toEqual({ ok: false, error: words });
});
