import { describe, expect, it } from 'vitest';
import { REGISTRATION_CHECK_MAX, registrationCheckQuerySchema, registrationView, type RegistrationMatch } from './registration.js';

const parse = (q: Record<string, string>) => registrationCheckQuerySchema.safeParse(q);
const issue = (q: Record<string, string>) => {
  const r = parse(q);
  return r.success ? null : r.error.issues[0]?.message;
};

describe('registrationCheckQuerySchema', () => {
  it('normalises a phone to E.164', () => {
    const r = parse({ phone: '0501234567' });
    expect(r.success && r.data).toEqual({ by: 'phone', phone: '+966501234567' });
  });

  it('takes a name or code of three characters or more', () => {
    const r = parse({ q: ' أحمد ' });
    expect(r.success && r.data).toEqual({ by: 'name', q: 'أحمد' });
    expect(issue({ q: 'اح' })).toBe('query_too_short');
  });

  it('needs exactly one of phone and q, and a valid phone', () => {
    expect(issue({})).toBe('one_of');
    expect(issue({ phone: '0501234567', q: 'أحمد' })).toBe('one_of');
    expect(issue({ phone: '12' })).toBe('invalid_phone');
  });
});

describe('registrationView', () => {
  const row = (i: number): RegistrationMatch => ({ name: `s${i}`, code: `AB-${1000 + i}`, status: 'active', teacher_name: null });

  it('keeps only the four whitelisted keys', () => {
    const leaky = { ...row(1), id: 'x', phone: '+966500000000', price: 100 };
    const view = registrationView([leaky]);
    expect(view.found).toBe(true);
    expect(Object.keys(view.matches[0] ?? {}).sort()).toEqual(['code', 'name', 'status', 'teacher_name']);
  });

  it('caps the list and says when there were more', () => {
    const rows = Array.from({ length: REGISTRATION_CHECK_MAX + 1 }, (_, i) => row(i));
    const view = registrationView(rows);
    expect(view.matches).toHaveLength(REGISTRATION_CHECK_MAX);
    expect(view.more).toBe(true);
    expect(registrationView([])).toEqual({ found: false, matches: [], more: false });
  });
});
