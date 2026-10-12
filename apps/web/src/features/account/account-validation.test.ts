import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { emailErrors, nameErrors, passwordErrors, phoneErrors, phoneValue } from './account-validation';

const E = t.account.errors;

describe('«حسابي» client checks', () => {
  it('name: 2 to 80 characters, trimmed (R-ACC-02)', () => {
    expect(nameErrors(' س ')).toEqual({ full_name: E.name_too_short });
    expect(nameErrors('x'.repeat(81))).toEqual({ full_name: E.name_too_long });
    expect(nameErrors('سارة')).toEqual({});
  });

  it('phone: E.164 out, blank removes, junk is invalid; the current password is required (R-ACC-02)', () => {
    expect(phoneValue('0551234567')).toBe('+966551234567');
    expect(phoneValue('  ')).toBeNull();
    expect(phoneValue('abc')).toBeUndefined();
    expect(phoneErrors({ phone: 'abc', password: '' })).toEqual({ phone_e164: E.invalid_phone, current_password: E.password_required });
    expect(phoneErrors({ phone: '', password: 'pw' })).toEqual({});
  });

  it('email: well formed, with the current password (R-ACC-03)', () => {
    expect(emailErrors({ email: 'nope', password: 'pw' })).toEqual({ email: E.invalid_email });
    expect(emailErrors({ email: ' New@AB.co ', password: '' })).toEqual({ current_password: E.password_required });
  });

  it('password: blank, short, same, mismatch (R-ACC-04)', () => {
    expect(passwordErrors({ current: '', next: '', confirm: '' })).toEqual({
      current_password: E.password_required,
      new_password: t.account.web.newPasswordRequired,
    });
    expect(passwordErrors({ current: 'old', next: 'short', confirm: 'short' }).new_password).toBe(E.password_too_short);
    expect(passwordErrors({ current: 'same-pass-1', next: 'same-pass-1', confirm: 'same-pass-1' }).new_password).toBe(E.password_same);
    expect(passwordErrors({ current: 'old', next: 'new-pass-1', confirm: 'new-pass-2' })).toEqual({ confirm: t.account.password.mismatch });
    expect(passwordErrors({ current: 'old', next: 'x'.repeat(300), confirm: 'x'.repeat(300) }).new_password).toBe(E.password_too_long);
    expect(passwordErrors({ current: 'old', next: 'new-pass-1', confirm: 'new-pass-1' })).toEqual({});
  });
});
