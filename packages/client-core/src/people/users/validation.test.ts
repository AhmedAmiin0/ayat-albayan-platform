import { describe, expect, it } from 'vitest';
import { initialCreateForm, userChecks } from '../../index.js';
import { TEXT } from './fixtures.test-util.js';

const checks = userChecks(() => TEXT);
const valid = { ...initialCreateForm(), email: 'a@b.co', full_name: 'هدى' };

describe('userChecks (docs/27 E3: the checks of web and mobile)', () => {
  it('email, name and an optional phone', () => {
    expect(checks.emailError(' a@b.co ')).toBeUndefined();
    expect(checks.emailError('nope')).toBe('email');
    expect(checks.nameError('ه')).toBe('name');
    expect(checks.phoneError('')).toBeUndefined();
    expect(Object.values(TEXT.phoneErrors)).toContain(checks.phoneError('12'));
  });

  it('a set password against the minimum, with {n} filled', () => {
    expect(checks.passwordError('', 8)).toBe('blank');
    expect(checks.passwordError('abc', 8)).toBe('short 8');
  });

  it('createErrors: a valid assistant passes; a guardian needs its record; a new teacher its name', () => {
    expect(checks.createErrors(valid)).toEqual({});
    expect(checks.createErrors({ ...valid, role: 'guardian' })).toEqual({ linked: 'link' });
    expect(checks.createErrors({ ...valid, role: 'teacher', teacherMode: 'new' })).toEqual({ teacher_name: 'teacher' });
    expect(checks.createErrors({ ...valid, credential: 'set', password: '' })).toEqual({ password: 'blank' });
  });

  it('editErrors: email, name and phone only', () => {
    expect(checks.editErrors({ email: 'x', full_name: 'هدى', phone: '', locale: 'ar', tz: 'Asia/Riyadh', role: 'assistant', role_id: '' })).toEqual({ email: 'email' });
  });

  it('reads the messages on every call (a language switch applies)', () => {
    let text = TEXT;
    const live = userChecks(() => text);
    text = { ...TEXT, validation: { ...TEXT.validation, email: 'بريد' } };
    expect(live.emailError('x')).toBe('بريد');
  });
});
