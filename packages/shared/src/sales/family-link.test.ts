import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import en from '../../i18n/en.json' with { type: 'json' };
import { isGrantable, systemPermissionsOf } from '@ab/catalog';
import { canLinkFamily, LEAD_FAMILY_LINK_ERRORS, leadFamilyLinkSchema, secondPhoneOf } from './family-link.js';

describe('leadFamilyLinkSchema', () => {
  it('trims and upper-cases a generated code', () => {
    expect(leadFamilyLinkSchema.parse({ code: '  ab-0183 ' })).toEqual({ code: 'AB-0183' });
    expect(leadFamilyLinkSchema.parse({ code: 'AB-10000' })).toEqual({ code: 'AB-10000' });
  });

  it('refuses a short code, free text, a missing code and extra keys', () => {
    for (const body of [{ code: 'AB-12' }, { code: 'x' }, {}, { code: 'AB-0183', guardian_id: 'g1' }]) {
      expect(leadFamilyLinkSchema.safeParse(body).success).toBe(false);
    }
  });
});

describe('canLinkFamily', () => {
  it('a lead chat without a family, whatever the lead status', () => {
    expect(canLinkFamily({ lead_id: 'l1', guardian_id: null, teacher_id: null })).toBe(true);
  });

  it('never a family chat, a teacher chat or an unknown number', () => {
    expect(canLinkFamily({ lead_id: 'l1', guardian_id: 'g1', teacher_id: null })).toBe(false);
    expect(canLinkFamily({ lead_id: 'l1', guardian_id: null, teacher_id: 't1' })).toBe(false);
    expect(canLinkFamily({ lead_id: null, guardian_id: null, teacher_id: null })).toBe(false);
  });
});

describe('secondPhoneOf', () => {
  it('the number that is not the main one; null without one', () => {
    const main = { phone_e164: '+966551110000', is_primary: true };
    expect(secondPhoneOf([main, { phone_e164: '+966552220000', is_primary: false }])).toBe('+966552220000');
    expect(secondPhoneOf([main])).toBeNull();
    expect(secondPhoneOf(undefined)).toBeNull();
  });
});

describe('leads.link_family «ربط بطالب موجود»', () => {
  it('is grantable, held by the system admin only by default (never sales)', () => {
    expect(isGrantable('leads.link_family')).toBe(true);
    expect(systemPermissionsOf('admin')).toContain('leads.link_family');
    for (const role of ['sales', 'teacher', 'assistant', 'guardian', 'student'] as const) {
      expect(systemPermissionsOf(role)).not.toContain('leads.link_family');
    }
  });

  it('has a label and a hint, and every error code a text, in Arabic and English', () => {
    for (const dict of [ar, en]) {
      expect((dict.permissions.items as Record<string, string>)['leads.link_family']?.trim()).toBeTruthy();
      expect((dict.permissions.hints as Record<string, string>)['leads.link_family']?.trim()).toBeTruthy();
      const errors: Record<string, string> = dict.inbox.linkFamily.errors;
      expect(LEAD_FAMILY_LINK_ERRORS.filter((c) => !errors[c]?.trim())).toEqual([]);
    }
  });
});
