import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { defineRoute } from '../define-route';

const item = z.object({ code: z.string() });
const build = (spec: object): unknown => Reflect.apply(defineRoute, undefined, [spec]);
const base = { method: 'GET', path: '/links', response: item };

describe('defineRoute permissions and tags', () => {
  it('keeps both lists on the frozen route object, typed as given', () => {
    const route = defineRoute({
      method: 'GET',
      path: '/links',
      response: item,
      permissions: ['links.read', 'links.all'],
      tags: ['links'],
    });
    expect(route.permissions).toEqual(['links.read', 'links.all']);
    expect(route.tags).toEqual(['links']);
    expectTypeOf(route.permissions).toEqualTypeOf<readonly ['links.read', 'links.all']>();
  });

  it('leaves both lists out of a route that names none', () => {
    const route = defineRoute({ method: 'GET', path: '/links', response: item });
    expect(route).not.toHaveProperty('permissions');
    expect(route).not.toHaveProperty('tags');
  });

  it('refuses an empty permissions list', () => {
    expect(() => build({ ...base, permissions: [] })).toThrow(
      'defineRoute GET /links: permissions must be a non-empty list without duplicates',
    );
  });

  it('refuses an empty tags list', () => {
    expect(() => build({ ...base, tags: [] })).toThrow(
      'defineRoute GET /links: tags must be a non-empty list without duplicates',
    );
  });

  it('refuses a duplicate permission', () => {
    expect(() => build({ ...base, permissions: ['links.read', 'links.read'] })).toThrow(
      'defineRoute GET /links: permissions must be a non-empty list without duplicates',
    );
  });

  it('refuses a duplicate tag and names every bad list', () => {
    expect(() => build({ ...base, permissions: [], tags: ['links', 'links'] })).toThrow(
      'defineRoute GET /links: permissions, tags must be a non-empty list without duplicates',
    );
  });
});
