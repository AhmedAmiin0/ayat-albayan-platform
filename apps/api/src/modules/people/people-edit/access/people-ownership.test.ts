import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import type { SalesOwnershipRule } from '@/modules/sales/sales';
import { PeopleOwnership } from './people-ownership';

const OWN = { leadIds: [], guardianIds: ['g1'], studentIds: ['s1'], phones: [] };
const user = (role: AuthUser['role']): AuthUser => ({ id: 'u1', email: null, role });
const guard = (own: typeof OWN | null) => {
  const scope = vi.fn().mockResolvedValue(own);
  return { ownership: new PeopleOwnership({ scope } as unknown as SalesOwnershipRule), scope };
};

describe('PeopleOwnership (SalesOwnershipRule, #612)', () => {
  it('rule off (null scope, the default): any student and family', async () => {
    const { ownership } = guard(null);
    await expect(ownership.student(user('sales'), 's9')).resolves.toBeUndefined();
    await expect(ownership.family(user('sales'), 'g9')).resolves.toBeUndefined();
  });

  it('rule on: hers pass, others are 403', async () => {
    const { ownership } = guard(OWN);
    await expect(ownership.student(user('sales'), 's1')).resolves.toBeUndefined();
    await expect(ownership.student(user('sales'), 's9')).rejects.toMatchObject({
      response: { code: 'not_your_student' },
    });
    await expect(ownership.family(user('sales'), 'g9')).rejects.toMatchObject({
      response: { code: 'not_your_family' },
    });
  });

  it('a move target (#621 review): a found family is checked, a created one is hers', async () => {
    const on = guard(OWN).ownership;
    await expect(on.target(user('sales'), { id: 'g9', created: false })).rejects.toMatchObject({
      response: { code: 'not_your_family' },
    });
    await expect(on.target(user('sales'), { id: 'g1', created: false })).resolves.toBeUndefined();
    await expect(on.target(user('sales'), { id: 'g9', created: true })).resolves.toBeUndefined();
    const off = guard(null).ownership;
    await expect(off.target(user('sales'), { id: 'g9', created: false })).resolves.toBeUndefined();
  });

  it('the admin is never bound and never reads the rule', async () => {
    const { ownership, scope } = guard(OWN);
    await ownership.student(user('admin'), 's9');
    expect(scope).not.toHaveBeenCalled();
  });
});
