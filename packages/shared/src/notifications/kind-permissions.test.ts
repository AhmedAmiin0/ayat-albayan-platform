import { describe, expect, it } from 'vitest';
import { ALL_PUSH_KINDS, FAMILY_PUSH_KINDS } from '@ab/catalog';
import { mayReceivePush, PUSH_KIND_PERMISSIONS } from './kind-permissions';

describe('PUSH_KIND_PERMISSIONS (R-NOT-01)', () => {
  it('every kind needs notifications.push', () => {
    for (const kind of ALL_PUSH_KINDS)
      expect(PUSH_KIND_PERMISSIONS[kind]).toContain('notifications.push');
  });

  it('inbox kinds also need inbox.read', () => {
    expect(mayReceivePush('new_lead', ['notifications.push'])).toBe(false);
    expect(mayReceivePush('new_message', ['notifications.push', 'inbox.read'])).toBe(true);
    expect(mayReceivePush('reminder_failed', ['inbox.read'])).toBe(false);
  });

  it('commission_earned («محفظتي») also needs self.sales_earnings: a role without it is told nothing', () => {
    expect(mayReceivePush('commission_earned', ['notifications.push', 'self.sales_earnings'])).toBe(true);
    expect(mayReceivePush('commission_earned', ['notifications.push', 'self.sales'])).toBe(false);
  });

  it('the family kinds need the portal scope too: staff never get them', () => {
    for (const kind of FAMILY_PUSH_KINDS) {
      expect(mayReceivePush(kind, ['notifications.push', 'self.portal'])).toBe(true);
      expect(mayReceivePush(kind, ['notifications.push', 'inbox.read'])).toBe(false);
    }
  });

  it('other kinds need only the bell', () => {
    expect(mayReceivePush('new_student', ['notifications.push'])).toBe(true);
    expect(mayReceivePush('new_student', [])).toBe(false);
  });
});
