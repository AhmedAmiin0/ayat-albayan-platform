import { describe, expect, it } from 'vitest';
import { createBody, editBody, initialCreateForm, initialEditForm } from '../../index.js';
import { detail } from './fixtures.test-util.js';

describe('createBody', () => {
  it('trims, lowercases the email and sends only what applies', () => {
    const f = { ...initialCreateForm(), email: ' A@B.co ', full_name: ' هدى ', phone: '+966552147730' };
    expect(createBody(f)).toEqual({ email: 'a@b.co', full_name: 'هدى', role: 'assistant', credential: 'generate', phone_e164: '+966552147730' });
  });

  it('a new teacher sends new_teacher, never linked_id', () => {
    const f = { ...initialCreateForm({ role: 'teacher' }), email: 'a@b.co', full_name: 'هدى', teacherMode: 'new' as const };
    const body = createBody({ ...f, newTeacher: { display_name_ar: ' أبرار ', display_name_en: '', gender: 'female' } });
    expect(body.new_teacher).toEqual({ display_name_ar: 'أبرار', gender: 'female' });
    expect(body).not.toHaveProperty('linked_id');
  });

  it('a prefill names the form after the linked record', () => {
    expect(initialCreateForm({ role: 'guardian', linked: { id: 'g1', name: 'أم يوسف' } as never }).full_name).toBe('أم يوسف');
  });
});

describe('editBody', () => {
  it('null when nothing changed; only the changed fields otherwise', () => {
    const d = detail();
    const f = initialEditForm(d, []);
    expect(editBody(d, f, [])).toBeNull();
    expect(editBody(d, { ...f, full_name: 'هدى سالم', phone: '+966552147730' }, [])).toEqual({ full_name: 'هدى سالم', phone_e164: '+966552147730' });
  });

  it('a custom role is kept in the form and cleared to null when the base role changes', () => {
    const d = detail({ role_id: 'r1' });
    const options = [{ id: 'r1', is_system: false }] as never;
    const f = initialEditForm(d, options);
    expect(f.role_id).toBe('r1');
    expect(editBody(d, { ...f, role: 'teacher', role_id: '' }, options)).toEqual({ role: 'teacher', role_id: null });
  });
});
