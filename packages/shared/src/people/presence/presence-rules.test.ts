import { describe, expect, it } from 'vitest';
import { USER_ROLES, type UserRole } from '@ab/catalog';
import { maySeePresence } from './presence-rules.js';

/** Every viewer → the targets it may see when linked (docs/33 §2). */
const ALLOWED: Record<UserRole, readonly UserRole[]> = {
  admin: USER_ROLES,
  teacher: ['guardian', 'student'],
  sales: ['guardian', 'student'],
  guardian: ['teacher'],
  student: ['teacher'],
  assistant: [],
};

describe('maySeePresence', () => {
  for (const viewer of USER_ROLES) {
    for (const target of USER_ROLES) {
      const want = ALLOWED[viewer].includes(target);
      it(`${viewer} → ${target}: ${want ? 'allowed' : 'denied'} when linked`, () => {
        expect(maySeePresence({ viewer, target, linked: true })).toBe(want);
      });
    }
  }

  it('denies every non-admin viewer when not linked', () => {
    for (const viewer of USER_ROLES.filter((r) => r !== 'admin')) {
      for (const target of USER_ROLES)
        expect(maySeePresence({ viewer, target, linked: false })).toBe(false);
    }
  });

  it('lets the admin see an unlinked user (the staff list)', () => {
    expect(maySeePresence({ viewer: 'admin', target: 'teacher', linked: false })).toBe(true);
  });

  it('denies a viewer or target without a role', () => {
    expect(maySeePresence({ viewer: null, target: 'teacher', linked: true })).toBe(false);
    expect(maySeePresence({ viewer: 'admin', target: null, linked: true })).toBe(false);
  });
});
