import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { roleErrorText } from './api';
import { emptyForm, formOf, suggestKey, toBody } from './role-form';

const ok = { ...emptyForm(), key: 'auditor', nameAr: 'مراجع', nameEn: 'Auditor', permissions: ['payments.view' as const] };

describe('toBody', () => {
  it('builds the API body', () => {
    expect(toBody(ok)).toEqual({
      ok: true,
      body: { key: 'auditor', name_ar: 'مراجع', name_en: 'Auditor', base_role: 'admin', permissions: ['payments.view'] },
    });
  });

  it('reports each bad field next to it', () => {
    const r = toBody({ ...ok, key: 'Bad Key', nameAr: '  ', nameEn: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(['key', 'nameAr', 'nameEn']);
      expect(r.errors.nameAr).toBe(t.common.required);
      expect(r.errors.key).toBe(t.roles.form.keyHint);
    }
  });
});

describe('formOf / suggestKey', () => {
  it('maps a role back into a form', () => {
    const form = formOf({ id: '1', key: 'k', name_ar: 'أ', name_en: 'A', base_role: 'teacher', is_system: false, permissions: ['students.view', 'leads.view'], user_count: 0 });
    expect(form).toMatchObject({ key: 'k', nameAr: 'أ', nameEn: 'A', base: 'teacher', permissions: ['leads.view', 'students.view'] });
  });

  it.each([
    ['Finance Clerk', 'finance_clerk'],
    ['  Q&A Lead! ', 'q_a_lead'],
    ['2nd Line', 'nd_line'],
    ['', ''],
    ['مراجع', ''],
  ])('%s -> %s', (name, key) => expect(suggestKey(name)).toBe(key));
});

describe('roleErrorText', () => {
  it('falls back to the generic sentence for anything unknown', () => {
    expect(roleErrorText(new Error('x'))).toBe(t.roles.error.generic);
  });
});
