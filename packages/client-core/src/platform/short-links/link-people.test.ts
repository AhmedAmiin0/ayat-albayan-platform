import { describe, expect, it } from 'vitest';
import { notOpenedCount, roleKey, userLook, visitOf, visitorLook } from './link-people';
import {
  accountVisit as visit, detail, listedUser as listed, typedUser as typed,
} from './short-links.test-util';

describe('roleKey', () => {
  it('keeps a known role and calls anything else unknown', () => {
    expect(roleKey('sales')).toBe('sales');
    expect(roleKey('guardian')).toBe('guardian');
    expect(roleKey('owner')).toBe('unknown');
  });
});

describe('users', () => {
  it('shows a person by name and role, a typed number as unregistered', () => {
    expect(userLook(listed)).toEqual({
      name: 'أحمد علي', role: 'guardian', phone: null, matched: false, unregistered: false,
    });
    expect(userLook(typed)).toEqual({
      name: null, role: null, phone: '+201120000003', matched: false, unregistered: true,
    });
  });

  it('finds the visit by person or phone', () => {
    expect(visitOf(listed, detail.visitorList)).toBe(visit);
    expect(visitOf(typed, detail.visitorList)).toBeNull();
    const byPhone = { ...visit, kind: 'phone' as const, person: null, phone: '+201120000003' };
    expect(visitOf(typed, [byPhone])).toBe(byPhone);
    expect(notOpenedCount(detail)).toBe(1);
  });
});

describe('visitors', () => {
  it('tells an account from a verified phone and its match', () => {
    expect(visitorLook(visit)).toMatchObject({ via: 'account', phone: null, matched: false });
    const phone = {
      kind: 'phone', person: { id: 'x', name: 'سارة', role: 'guardian' }, phone: '+966550000006',
      family: { id: 'f', name: 'أسرة سارة' }, firstAt: '', lastAt: '', opens: 1,
    } as const;
    expect(visitorLook(phone)).toEqual({
      name: 'سارة', role: 'guardian', phone: '+966550000006', matched: true,
      unregistered: false, via: 'whatsapp', family: 'أسرة سارة',
    });
  });
});
