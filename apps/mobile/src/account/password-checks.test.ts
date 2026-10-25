import { t } from '@/core/lib/i18n/i18n';
import { passwordChecks } from './password-checks';

const e = t.account.errors;

describe('passwordChecks (R-ACC-04)', () => {
  test('sendable: nothing found', () => {
    expect(passwordChecks({ current: 'old-secret', next: 'new-secret', confirm: 'new-secret' })).toEqual({});
  });

  test('the confirmation must match', () => {
    expect(passwordChecks({ current: 'old-secret', next: 'new-secret', confirm: 'new-secreT' })).toEqual({
      confirm: t.account.password.mismatch,
    });
  });

  test('current required, new too short (passwordProblem with the minimum)', () => {
    expect(passwordChecks({ current: '', next: 'short', confirm: 'short' })).toEqual({
      current_password: e.password_required,
      new_password: e.password_too_short,
    });
    expect(passwordChecks({ current: 'x', next: 'abcd', confirm: 'abcd' }, 4)).toEqual({});
  });

  test('blank, too long and same as the current one', () => {
    expect(passwordChecks({ current: 'a', next: '  ', confirm: '  ' }).new_password).toBe(t.account.mobile.newRequired);
    const long = 'x'.repeat(73);
    expect(passwordChecks({ current: 'a', next: long, confirm: long }).new_password).toBe(e.password_too_long);
    expect(passwordChecks({ current: 'same-secret', next: 'same-secret', confirm: 'same-secret' }).new_password).toBe(e.password_same);
  });
});
