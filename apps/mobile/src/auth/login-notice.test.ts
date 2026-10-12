import { act, renderHook } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { isAccountDisabled, isOtherAppRole, setLoginNotice, useLoginNotice } from './login-notice';

test('only a 403 with code account_disabled is a disabled account', () => {
  expect(isAccountDisabled(new ApiError(403, { code: 'account_disabled' }))).toBe(true);
  expect(isAccountDisabled(new ApiError(403, { code: 'other' }))).toBe(false);
  expect(isAccountDisabled(new ApiError(403, 'account_disabled'))).toBe(false);
  expect(isAccountDisabled(new ApiError(403))).toBe(false);
  expect(isAccountDisabled(new ApiError(401, { code: 'account_disabled' }))).toBe(false);
  expect(isAccountDisabled(new TypeError('offline'))).toBe(false);
});

test('guardian and student are other apps\' roles; the four app roles, null and junk are not', () => {
  for (const role of ['guardian', 'student']) expect(isOtherAppRole(role)).toBe(true);
  for (const role of ['admin', 'teacher', 'sales', 'assistant', null, undefined, 'x']) expect(isOtherAppRole(role)).toBe(false);
});

test('the login screen sees the notice as soon as it is set, and loses it when cleared', async () => {
  const { result } = await renderHook(() => useLoginNotice());
  expect(result.current).toBeNull();
  await act(async () => setLoginNotice('accountDisabled'));
  expect(result.current).toBe(t.mobileNav.accountDisabled);
  await act(async () => setLoginNotice('wrongApp'));
  expect(result.current).toBe(t.mobileRoles.wrongApp);
  await act(async () => setLoginNotice(null));
  expect(result.current).toBeNull();
});
