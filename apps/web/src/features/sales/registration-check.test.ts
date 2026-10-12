import { describe, expect, it } from 'vitest';
import { checkRequest } from './registration-check';

describe('checkRequest «التحقق من التسجيل»', () => {
  it('a phone becomes E.164 in ?phone=', () => {
    expect(checkRequest('phone', '+966 50 123 4567')).toEqual({ ok: true, by: 'phone', path: '/sales/registration-check?phone=%2B966501234567' });
  });

  it('a name goes in ?q= (trimmed)', () => {
    expect(checkRequest('name', '  سهيلة ')).toEqual({ ok: true, by: 'name', path: `/sales/registration-check?q=${encodeURIComponent('سهيلة')}` });
  });

  it('refuses a short name, a bad phone and an empty box', () => {
    expect(checkRequest('name', 'سه')).toEqual({ ok: false, code: 'query_too_short' });
    expect(checkRequest('phone', '12')).toEqual({ ok: false, code: 'invalid_phone' });
    expect(checkRequest('name', '')).toEqual({ ok: false, code: 'one_of' });
    expect(checkRequest('phone', ' ')).toMatchObject({ ok: false });
  });
});
