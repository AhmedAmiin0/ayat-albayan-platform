import { describe, expect, it } from 'vitest';
import { permissionsOf, permissionsView } from '../index.js';

describe('permissionsView (E2, D6: deny until /auth/me has loaded)', () => {
  it('grants nothing while /auth/me is loading or signed out', () => {
    for (const me of [undefined, null]) {
      const view = permissionsView(me);
      expect(view.permissions).toEqual([]);
      expect(view.can('payments.read')).toBe(false);
    }
  });

  it('grants nothing when the answer has no permissions list', () => {
    expect(permissionsView({ role: 'admin' }).can('payments.read')).toBe(false);
  });

  it('grants exactly the listed keys once /auth/me has answered', () => {
    const view = permissionsView({ role: 'admin', permissions: ['payments.read'] });
    expect(view.permissions).toEqual(['payments.read']);
    expect(view.can('payments.read')).toBe(true);
    expect(view.can('pricing.read')).toBe(false);
  });
});

describe('permissionsOf', () => {
  it('reads /auth/me and drops unknown keys', () => {
    expect(permissionsOf({ role: 'admin', permissions: ['payments.read', 'nope', 3] })).toEqual(['payments.read']);
    expect(permissionsOf({ role: 'admin' })).toEqual([]);
    expect(permissionsOf(null)).toEqual([]);
  });
});
