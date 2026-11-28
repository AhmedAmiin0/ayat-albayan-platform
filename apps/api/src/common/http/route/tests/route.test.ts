import { defineRoute } from '@ab/core';
import { Controller, Module } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { notFound } from '@/common/http/errors';
import { returnsOf } from '@/common/http/returns';
import { Route, RouteInput, routeOf, type RouteInputOf } from '@/common/http/route';

const item = z.object({ id: z.string(), name: z.string() });
const routes = {
  list: defineRoute({
    method: 'GET',
    path: '/probe/items',
    query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
    response: z.array(item),
  }),
  rename: defineRoute({
    method: 'PATCH',
    path: '/probe/items/:id',
    params: z.object({ id: z.string().regex(/^i\d+$/) }),
    body: z.object({ name: z.string().min(1) }),
    response: item,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/probe/items/:id',
    params: z.object({ id: z.string().regex(/^i\d+$/) }),
    response: 'empty',
  }),
};

@Controller()
class RouteProbeController {
  @Route(routes.list)
  list(@RouteInput() input: RouteInputOf<typeof routes.list>) {
    return { page: input.query.page, params: input.params, body: input.body };
  }

  @Route(routes.rename)
  rename(
    @RouteInput({ badParam: () => notFound('item_not_found') }) input: RouteInputOf<
      typeof routes.rename
    >,
  ) {
    return { id: input.params.id, name: input.body.name };
  }

  @Route(routes.remove)
  remove(@RouteInput() input: RouteInputOf<typeof routes.remove>) {
    return { id: input.params.id };
  }
}

@Module({ controllers: [RouteProbeController] })
class RouteProbeModule {}

let app: NestFastifyApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [RouteProbeModule] }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

const send = (method: 'GET' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
  app.inject({ method, url, ...(payload ? { payload } : {}) });

describe('@Route', () => {
  it('serves the route object at its method and full path', async () => {
    const res = await send('GET', '/probe/items?page=2');
    expect([res.statusCode, res.json()]).toEqual([200, { page: 2 }]);
  });

  it('keeps the route object on the handler for the contract snapshot', () => {
    expect(routeOf(RouteProbeController.prototype.rename)).toBe(routes.rename);
    expect(routeOf(() => undefined)).toBeUndefined();
  });

  it('serves a DELETE at the same path as a PATCH', async () => {
    const res = await send('DELETE', '/probe/items/i7');
    expect(res.json()).toEqual({ id: 'i7' });
  });
});

describe('@RouteInput', () => {
  it('parses params, query and body with the route schemas', async () => {
    const res = await send('PATCH', '/probe/items/i1', { name: 'Nour', extra: true });
    expect([res.statusCode, res.json()]).toEqual([200, { id: 'i1', name: 'Nour' }]);
  });

  it('answers the validation envelope for a bad query', async () => {
    const res = await send('GET', '/probe/items?page=0');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed', issues: [{ path: 'page' }] });
  });

  it("answers the route's own error for a bad param", async () => {
    const res = await send('PATCH', '/probe/items/x', { name: 'Nour' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([404, 'item_not_found']);
  });

  it('lets a bad body win over a bad param, as ZodBody did over ZodParam', async () => {
    const res = await send('PATCH', '/probe/items/x', { name: '' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed', issues: [{ path: 'name' }] });
  });

  it('answers the validation envelope for a bad param without its own error', async () => {
    const res = await send('DELETE', '/probe/items/x');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed', issues: [{ path: 'id' }] });
  });
});

describe('@Route answers', () => {
  it('declares a JSON answer for the response check and none for an empty one', () => {
    expect(returnsOf(RouteProbeController.prototype.rename)).toBe(item);
    expect(returnsOf(RouteProbeController.prototype.remove)).toBeUndefined();
  });
});
