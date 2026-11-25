import type { PortalStudent } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { familyTabs, hasFamilyTab } from './family-tabs';

const student: PortalStudent = {
  id: 's1', code: 'AB-0001', name: 's1', tz: 'Asia/Riyadh', contact_is_self: false,
};

describe('familyTabs', () => {
  it('a student in view (own, or the child a guardian works as): their reports have a tab', () => {
    const one = { state: 'one', student } as const;
    expect(familyTabs(one)).toEqual(['home', 'schedule', 'reports', 'account']);
    expect(hasFamilyTab(one, 'reports')).toBe(true);
  });

  it('no student yet, or none: no «التقارير»', () => {
    for (const state of ['loading', 'choose', 'empty'] as const) {
      expect(familyTabs({ state })).toEqual(['home', 'schedule', 'account']);
      expect(hasFamilyTab({ state }, 'reports')).toBe(false);
    }
  });
});
