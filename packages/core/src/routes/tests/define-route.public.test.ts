import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { defineRoute } from '../define-route';

const item = z.object({ code: z.string() });
const build = (spec: object): unknown => Reflect.apply(defineRoute, undefined, [spec]);
const base = { method: 'GET', path: '/links/:code', params: item, response: item };

describe('defineRoute isPublic', () => {
  it('keeps isPublic on the frozen route object, typed as true', () => {
    const route = defineRoute({ ...base, method: 'GET', isPublic: true, tags: ['links'] });
    expect(route.isPublic).toBe(true);
    expect(Object.isFrozen(route)).toBe(true);
    expectTypeOf(route.isPublic).toEqualTypeOf<true>();
  });

  it('leaves isPublic out of a route that does not say it', () => {
    expect(defineRoute({ ...base, method: 'GET' })).not.toHaveProperty('isPublic');
  });

  it('refuses a public route that also names permissions', () => {
    expect(() => build({ ...base, isPublic: true, permissions: ['links.read'] })).toThrow(
      'defineRoute GET /links/:code: a public route cannot name permissions',
    );
  });

  it('refuses isPublic with any value other than true', () => {
    expect(() => build({ ...base, isPublic: false })).toThrow(/isPublic/);
    expect(() => build({ ...base, isPublic: 'yes' })).toThrow(/isPublic/);
  });
});
