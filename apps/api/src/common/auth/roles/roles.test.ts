import { USER_ROLES } from '@ab/catalog';
import { describe, expect, it } from 'vitest';
import { isAdmin, isSales } from '@/common/auth/roles';
import type { AuthUser } from '@/common/auth/verify-token';

const holders = (pass: (user: Pick<AuthUser, 'role'>) => boolean) =>
  [...USER_ROLES, null].filter((role) => pass({ role }));

describe('role predicates', () => {
  it('isAdmin holds for the admin base role only, never a user without a role', () => {
    expect(holders(isAdmin)).toEqual(['admin']);
  });

  it('isSales holds for the sales base role only, not the assistant role', () => {
    expect(holders(isSales)).toEqual(['sales']);
  });
});
