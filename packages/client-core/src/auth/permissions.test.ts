import { describe, expect, it } from 'vitest';
import { meLoaded, permissionsOf, permissionsView } from '../index.js';

describe('permissionsView (E2, D6: deny until /auth/me has loaded)', () => {
  it('grants nothing and is not loaded while /auth/me is loading or signed out', () => {
    for (const me of [undefined, null]) {
      const view = permissionsView(me);
      expect(view.loaded).toBe(false);
      expect(view.permissions).toEqual([]);
      expect(view.can('payments.read')).toBe(false);
    }
  });

  it('grants nothing when the answer has no permissions list (an API from before dynamic roles)', () => {
    const view = permissionsView({ role: 'admin' });
    expect(view.loaded).toBe(true);
    expect(view.can('payments.read')).toBe(false);
  });

  it('grants exactly the listed keys once /auth/me has answered', () => {
    const view = permissionsView({ role: 'admin', permissions: ['payments.read'] });
    expect(view.loaded).toBe(true);
    expect(view.permissions).toEqual(['payments.read']);
    expect(view.can('payments.read')).toBe(true);
    expect(view.can('pricing.read')).toBe(false);
  });

  it('is loaded with an empty list: a role that holds nothing sees nothing', () => {
    const view = permissionsView({ role: 'teacher', permissions: [] });
    expect(view.loaded).toBe(true);
    expect(view.can('payments.read')).toBe(false);
  });
});

describe('permissionsOf / meLoaded', () => {
  it('reads /auth/me and drops unknown keys', () => {
    expect(permissionsOf({ role: 'admin', permissions: ['payments.read', 'nope', 3] })).toEqual(['payments.read']);
    expect(permissionsOf({ role: 'admin' })).toEqual([]);
    expect(permissionsOf(null)).toEqual([]);
  });

  it('is loaded once /auth/me answered with an object', () => {
    expect(meLoaded({ permissions: [] })).toBe(true);
    expect(meLoaded(undefined)).toBe(false);
    expect(meLoaded(null)).toBe(false);
  });
});
