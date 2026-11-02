import { describe, expect, it } from 'vitest';
import { editBody, initialEditForm } from './edit-form.js';
import { detail } from './fixtures.test-util.js';

describe('editBody: one PATCH field per change', () => {
  const d = detail({ phone_e164: '+966552147730' });
  const f = initialEditForm(d, []);

  it.each([
    ['email', { email: ' New@B.co ' }, { email: 'new@b.co' }],
    ['locale', { locale: 'en' as const }, { locale: 'en' }],
    ['tz', { tz: 'Africa/Cairo' }, { tz: 'Africa/Cairo' }],
    ['a cleared phone', { phone: '  ' }, { phone_e164: null }],
    [
      'the role (role_id goes with it)',
      { role: 'teacher' as const },
      { role: 'teacher', role_id: null },
    ],
  ])('%s', (_name, change, body) => {
    expect(editBody(d, { ...f, ...change }, [])).toEqual(body);
  });

  it('the same email in other case or with spaces is no change', () => {
    expect(editBody(d, { ...f, email: ' A@B.CO ' }, [])).toBeNull();
  });

  it('a new custom role on the same base role sends role_id alone', () => {
    const options = [{ id: 'r2', is_system: false }] as never;
    expect(editBody(d, { ...f, role_id: 'r2' }, options)).toEqual({ role_id: 'r2' });
  });
});
