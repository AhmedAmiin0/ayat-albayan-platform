import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { defineRoute } from '../define-route';
import { pathKey } from '../route-key';
import type { RouteKeyInput } from '../route.types';

const ok = z.object({ ok: z.boolean() });
const list = defineRoute({
  method: 'GET',
  path: '/pricing/list',
  query: z.object({ students: z.coerce.number(), country: z.string().optional() }),
  response: ok,
});
const detail = defineRoute({
  method: 'GET',
  path: '/students/:id/notes',
  params: z.object({ id: z.string() }),
  query: z.object({ page: z.number().optional() }),
  response: ok,
});
const me = defineRoute({ method: 'GET', path: '/auth/me', response: ok });

describe('pathKey', () => {
  it('is the path segments, so a prefix holds every key under it', () => {
    expect(pathKey('/students/s1')).toEqual(['students', 's1']);
    expect(pathKey('/auth/me')).toEqual(['auth', 'me']);
    expect(pathKey('')).toEqual([]);
  });
});

describe('route key', () => {
  it('key.all is the path key of the route path, frozen', () => {
    expect(list.key.all).toEqual(['pricing', 'list']);
    expect(detail.key.all).toEqual(pathKey(detail.path));
    expect(Object.isFrozen(list.key)).toBe(true);
    expect(Object.isFrozen(list.key.all)).toBe(true);
  });

  it('key.of puts the input after key.all, so key.all is its prefix', () => {
    const input = { students: 2, country: 'SA' };
    expect(list.key.of(input)).toEqual(['pricing', 'list', input]);
    expect(list.key.of(input).slice(0, 2)).toEqual(list.key.all);
    expect(list.key.of({ students: 3 })).not.toEqual(list.key.of(input));
  });

  it('key.of never changes key.all', () => {
    list.key.of({ students: 1 });
    expect(list.key.all).toEqual(['pricing', 'list']);
  });

  it('a route without inputs keys its one entry by an empty input', () => {
    expect(me.key.of({})).toEqual(['auth', 'me', {}]);
  });

  it('types the input as the params and the query, each as z.input', () => {
    expectTypeOf<RouteKeyInput<typeof list>>().toEqualTypeOf<{
      students: unknown;
      country?: string | undefined;
    }>();
    expectTypeOf<RouteKeyInput<typeof me>>().toEqualTypeOf<Partial<Record<string, never>>>();
    expectTypeOf<RouteKeyInput<typeof detail>>().toEqualTypeOf<
      { id: string } & { page?: number | undefined }
    >();
  });
});
