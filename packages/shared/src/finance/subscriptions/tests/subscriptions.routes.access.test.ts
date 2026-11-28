import { describe, expect, it } from 'vitest';
import { studentBalanceRoutes, subscriptionRoutes } from '../subscriptions.routes';

const accessOf = ({ permissions, tags }: { permissions?: unknown; tags?: unknown }) => ({
  permissions,
  tags,
});

describe('subscriptionRoutes: access', () => {
  it('lets readers list, quote and open a package', () => {
    const r = subscriptionRoutes;
    for (const route of [r.list, r.quote, r.get]) {
      expect(accessOf(route)).toEqual({
        permissions: ['subscriptions.read'],
        tags: ['subscriptions'],
      });
    }
  });

  it('keeps every change for writers', () => {
    const r = subscriptionRoutes;
    for (const route of [r.create, r.update, r.cancel, r.remove]) {
      expect(accessOf(route)).toEqual({
        permissions: ['subscriptions.write'],
        tags: ['subscriptions'],
      });
    }
  });

  it('shows a balance to whoever may see a student balance', () => {
    expect(accessOf(studentBalanceRoutes.get)).toEqual({
      permissions: ['students.balance'],
      tags: ['students'],
    });
  });
});
