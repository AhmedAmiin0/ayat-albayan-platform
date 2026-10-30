import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import en from '../../i18n/en.json' with { type: 'json' };
import { defaultGrantsOf, EDITABLE_SYSTEM_ROLES, isEditableSystemRole, isGrantable, systemPermissionsOf } from './catalog.js';

// Owner 2026-10-12 (docs/16 rows 23–24): two sales options the admin can switch off.
const KEYS = ['students.check_registration', 'subscriptions.set_start_date'] as const;

describe('sales options «التحقق من التسجيل» and «تحديد تاريخ بداية الاشتراك»', () => {
  it('are grantable, ON for sales and the admin by default, off for teacher and assistant', () => {
    for (const k of KEYS) {
      expect(isGrantable(k)).toBe(true);
      expect(systemPermissionsOf('sales')).toContain(k);
      expect(systemPermissionsOf('admin')).toContain(k);
      for (const role of ['teacher', 'assistant', 'guardian', 'student'] as const) expect(systemPermissionsOf(role)).not.toContain(k);
    }
  });

  it('have a label and a hint in Arabic and English', () => {
    for (const dict of [ar, en]) {
      const hints: Record<string, string> = dict.permissions.hints;
      for (const k of KEYS) expect(hints[k]?.trim()).toBeTruthy();
    }
  });
});

// Owner 2026-10-26: «عرض سعر» in the chat calls the calculator's routes; sales hold pricing.read by default.
describe('pricing.read', () => {
  it('is a default of sales (and the admin), never of a teacher or an assistant', () => {
    expect(defaultGrantsOf('sales')).toContain('pricing.read');
    expect(systemPermissionsOf('admin')).toContain('pricing.read');
    for (const role of ['teacher', 'assistant', 'guardian', 'student'] as const) expect(systemPermissionsOf(role)).not.toContain('pricing.read');
  });
});

describe('editable system roles', () => {
  it('are teacher, assistant and sales; never the admin or the portal roles', () => {
    expect([...EDITABLE_SYSTEM_ROLES]).toEqual(['teacher', 'assistant', 'sales']);
    expect(isEditableSystemRole('admin')).toBe(false);
    expect(isEditableSystemRole('guardian')).toBe(false);
    expect(isEditableSystemRole('custom-1234abcd')).toBe(false);
  });

  it('restore to grantable keys only (no self.* scope key)', () => {
    for (const role of EDITABLE_SYSTEM_ROLES) expect(defaultGrantsOf(role).every(isGrantable)).toBe(true);
  });
});

// Owner 2026-10-28 (docs/16): «تأكيد الحلقة» from the assistant's «الجدول», its own narrow key.
describe('lessons.confirm', () => {
  it('is grantable, a default of sales (and the admin), never of a teacher, an assistant or the portal', () => {
    expect(isGrantable('lessons.confirm')).toBe(true);
    expect(defaultGrantsOf('sales')).toContain('lessons.confirm');
    expect(systemPermissionsOf('admin')).toContain('lessons.confirm');
    for (const role of ['teacher', 'assistant', 'guardian', 'student'] as const) expect(systemPermissionsOf(role)).not.toContain('lessons.confirm');
  });

  it('has a hint in Arabic and English', () => {
    for (const dict of [ar, en]) expect((dict.permissions.hints as Record<string, string>)['lessons.confirm']?.trim()).toBeTruthy();
  });
});

// Owner 2026-10-28 (docs/16 row 37c): «إيقاف الدورة مؤقتًا», its own narrow key, any student.
describe('courses.pause', () => {
  it('is grantable, a default of sales (and the admin), never of a teacher, an assistant or the portal', () => {
    expect(isGrantable('courses.pause')).toBe(true);
    expect(defaultGrantsOf('sales')).toContain('courses.pause');
    expect(systemPermissionsOf('admin')).toContain('courses.pause');
    for (const role of ['teacher', 'assistant', 'guardian', 'student'] as const) expect(systemPermissionsOf(role)).not.toContain('courses.pause');
  });

  it('has a label and a hint in Arabic and English', () => {
    for (const dict of [ar, en]) {
      expect((dict.permissions.items as Record<string, string>)['courses.pause']?.trim()).toBeTruthy();
      expect((dict.permissions.hints as Record<string, string>)['courses.pause']?.trim()).toBeTruthy();
    }
  });
});

// Owner 2026-10-29 (docs/16 row 38): «تجديد اشتراك أي طالب من المحادثة», narrow, never a sales default.
describe('sales.renew_any', () => {
  it('is grantable, held by the admin only by default (never sales, a teacher, an assistant or the portal)', () => {
    expect(isGrantable('sales.renew_any')).toBe(true);
    expect(systemPermissionsOf('admin')).toContain('sales.renew_any');
    for (const role of ['sales', 'teacher', 'assistant', 'guardian', 'student'] as const) expect(systemPermissionsOf(role)).not.toContain('sales.renew_any');
  });

  it('has a label and a hint in Arabic and English', () => {
    expect(ar.permissions.items['sales.renew_any']).toBe('تجديد اشتراك أي طالب من المحادثة');
    for (const dict of [ar, en]) expect((dict.permissions.hints as Record<string, string>)['sales.renew_any']?.trim()).toBeTruthy();
    expect((en.permissions.items as Record<string, string>)['sales.renew_any']?.trim()).toBeTruthy();
  });
});
