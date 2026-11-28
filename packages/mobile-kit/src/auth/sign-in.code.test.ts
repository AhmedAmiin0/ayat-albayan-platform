import { ApiError } from '../lib/http/api';
import { t } from '../lib/i18n/i18n';
import { noticeText } from './login-notice';
import { signInWithCode } from './sign-in';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('../lib/http/supabase', () => ({
  supabase: { auth: { verifyOtp: jest.fn(), signOut: jest.fn() } },
}));

const body = { phone: '+966500000005', code: '123456' };

test.each([
  [503, 'codes_unavailable', t.teacherAuth.codesUnavailable],
  [401, 'invalid_code', t.familyAuth.errors.invalid_code],
  [403, 'account_disabled', noticeText('accountDisabled')],
])("a %s %s from the staff verify is said in the teacher's words", async (status, code, words) => {
  mockApi.onWrite(() => Promise.reject(new ApiError(status, { code })));
  const res = await signInWithCode(body);
  expect(mockApi.writes()).toContainEqual({
    method: 'POST',
    path: '/auth/staff-code/verify',
    body: body,
  });
  expect(res).toEqual({ ok: false, error: words });
});
