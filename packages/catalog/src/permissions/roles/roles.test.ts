import { describe, expect, it } from 'vitest';
import { HOME_BY_ROLE, isUserRole, USER_ROLES } from './roles.js';

describe('roles', () => {
  it('accepts every known role', () => {
    for (const role of USER_ROLES) expect(isUserRole(role)).toBe(true);
  });

  it.each(['superuser', '', null, undefined, 1])('rejects %s', (value) => {
    expect(isUserRole(value)).toBe(false);
  });

  it('has a home route for every role', () => {
    expect(Object.keys(HOME_BY_ROLE).sort()).toEqual([...USER_ROLES].sort());
  });
});
