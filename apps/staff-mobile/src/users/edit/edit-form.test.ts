import type { UserDetail, UserRoleOption } from '@ab/shared';
import { editBody, editErrors, initialEditForm } from './edit-form';

const DETAIL: UserDetail = {
  id: 'u1', email: 'sara@ab.co', full_name: 'سارة', phone_e164: '+966551234567', role: 'assistant', role_id: 'sys-a', role_key: 'assistant',
  status: 'active', disabled_at: null, last_sign_in_at: null, created_at: '2026-01-01T00:00:00Z', linked: null,
  locale: 'ar', tz: 'Asia/Riyadh', disabled_reason: null,
};
const SYS: UserRoleOption = { id: 'sys-a', key: 'assistant', name_ar: 'مساعد/ة', name_en: null, base_role: 'assistant', is_system: true, assignable: true };
const CUSTOM: UserRoleOption = { ...SYS, id: 'c-1', key: 'accountant', name_ar: 'محاسب', is_system: false };
const OPTIONS = [SYS, CUSTOM];

describe('edit form', () => {
  it('starts from the detail; a system role is the default (empty role_id)', () => {
    expect(initialEditForm(DETAIL, OPTIONS)).toMatchObject({ email: 'sara@ab.co', role_id: '', locale: 'ar', tz: 'Asia/Riyadh' });
    expect(initialEditForm({ ...DETAIL, role_id: 'c-1' }, OPTIONS).role_id).toBe('c-1');
  });
  it('no change, no body', () => {
    expect(editBody(DETAIL, initialEditForm(DETAIL, OPTIONS), OPTIONS)).toBeNull();
  });
  it('sends only what changed', () => {
    const f = { ...initialEditForm(DETAIL, OPTIONS), full_name: ' سارة أحمد ', email: 'New@Ab.co', locale: 'en' as const };
    expect(editBody(DETAIL, f, OPTIONS)).toEqual({ full_name: 'سارة أحمد', email: 'new@ab.co', locale: 'en' });
  });
  it('clearing the phone sends null; a local phone is normalised', () => {
    const base = initialEditForm(DETAIL, OPTIONS);
    expect(editBody(DETAIL, { ...base, phone: '' }, OPTIONS)).toEqual({ phone_e164: null });
    expect(editBody(DETAIL, { ...base, phone: '0551234568' }, OPTIONS)).toEqual({ phone_e164: '+966551234568' });
  });
  it('a custom role sends role_id; back to default sends null', () => {
    const base = initialEditForm(DETAIL, OPTIONS);
    expect(editBody(DETAIL, { ...base, role_id: 'c-1' }, OPTIONS)).toEqual({ role_id: 'c-1' });
    const held = { ...DETAIL, role_id: 'c-1' };
    expect(editBody(held, { ...initialEditForm(held, OPTIONS), role_id: '' }, OPTIONS)).toEqual({ role_id: null });
  });
  it('a new base role sends role and role_id', () => {
    const base = initialEditForm(DETAIL, OPTIONS);
    expect(editBody(DETAIL, { ...base, role: 'sales' }, OPTIONS)).toEqual({ role: 'sales', role_id: null });
  });
  it('validates email, name and phone', () => {
    const base = initialEditForm(DETAIL, OPTIONS);
    expect(editErrors(base)).toEqual({});
    expect(Object.keys(editErrors({ ...base, email: 'x', full_name: '', phone: 'abc' })).sort()).toEqual(['email', 'full_name', 'phone']);
  });
});
