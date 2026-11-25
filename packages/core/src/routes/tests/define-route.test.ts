import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { defineRoute } from '../define-route';
import type { RouteBody, RouteParams, RouteQuery, RouteResult } from '../route.types';

const item = z.object({ code: z.string(), visits: z.number() });
const detail = defineRoute({
  method: 'PATCH',
  path: '/links/:code',
  params: z.object({ code: z.string() }),
  query: z.object({ page: z.coerce.number().default(1) }),
  body: z.object({ title: z.string().trim() }),
  response: item,
});

describe('defineRoute', () => {
  it('returns a frozen route object with the given parts', () => {
    expect(Object.isFrozen(detail)).toBe(true);
    expect(detail.method).toBe('PATCH');
    expect(detail.path).toBe('/links/:code');
    expect(detail.response).toBe(item);
  });

  it('types each part from its schema: inputs as z.input, the result as z.output', () => {
    expectTypeOf<RouteParams<typeof detail>>().toEqualTypeOf<{ code: string }>();
    expectTypeOf<RouteQuery<typeof detail>>().toEqualTypeOf<{ page?: unknown }>();
    expectTypeOf<RouteBody<typeof detail>>().toEqualTypeOf<{ title: string }>();
    expectTypeOf<RouteResult<typeof detail>>().toEqualTypeOf<{ code: string; visits: number }>();
  });

  it('types an answer without a JSON body as undefined', () => {
    const revoke = defineRoute({ method: 'DELETE', path: '/links', response: 'empty' });
    expectTypeOf<RouteResult<typeof revoke>>().toEqualTypeOf<undefined>();
    expectTypeOf<RouteParams<typeof revoke>>().toEqualTypeOf<undefined>();
  });

  it('refuses a path whose :params differ from the params schema', () => {
    const params = z.object({ id: z.string() });
    expect(() =>
      defineRoute({ method: 'GET', path: '/links/:code', params, response: item }),
    ).toThrow('defineRoute GET /links/:code: path params [code] differ from schema params [id]');
  });

  it('refuses a :param without a params schema', () => {
    expect(() => defineRoute({ method: 'GET', path: '/links/:code', response: item })).toThrow(
      'defineRoute GET /links/:code: path params [code] differ from schema params []',
    );
  });

  it('refuses an unknown method', () => {
    const spec = { method: 'TRACE', path: '/links', response: item };
    expect(() => Reflect.apply(defineRoute, undefined, [spec])).toThrow();
  });
});
