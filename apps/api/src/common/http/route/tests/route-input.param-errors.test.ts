import { defineRoute } from '@ab/core';
import { Controller, Module } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { badRequest, notFound } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';

const routes = {
  put: defineRoute({
    method: 'PUT',
    path: '/probe/:id/items/:code/:page',
    params: z.object({
      id: z.uuid(),
      code: z.string().regex(/^[a-z]+$/),
      page: z.coerce.number().int().min(1),
    }),
    body: z.object({ value: z.string().min(1) }),
    response: z.object({ id: z.string(), code: z.string(), page: z.number() }),
  }),
  get: defineRoute({
    method: 'GET',
    path: '/probe/:id/pages/:page',
    params: z.object({ id: z.uuid(), page: z.coerce.number().int().min(1) }),
    response: z.object({ id: z.string(), page: z.number() }),
  }),
};

const itemNotFound = () => notFound('item_not_found');
const badCode = () => badRequest('invalid_code');

@Controller()
class ParamErrorsProbeController {
  @Route(routes.put)
  put(
    @RouteInput({
      paramErrors: [
        { name: 'code', fail: badCode },
        { name: 'id', fail: itemNotFound },
      ],
    })
    { params }: RouteInputOf<typeof routes.put>,
  ) {
    return params;
  }

  @Route(routes.get)
  get(
    @RouteInput({ paramErrors: [{ name: 'page' }, { name: 'id', fail: itemNotFound }] })
    { params }: RouteInputOf<typeof routes.get>,
  ) {
    return params;
  }
}

@Module({ controllers: [ParamErrorsProbeController] })
class ParamErrorsProbeModule {}

let app: NestFastifyApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ParamErrorsProbeModule] }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

const ID = '7d3f5d8e-2b1a-4c6e-9f0a-1b2c3d4e5f60';
const put = (url: string, payload: object = { value: 'v' }) =>
  app.inject({ method: 'PUT', url, payload });
const answer = async (url: string, payload?: object) => {
  const res = await put(url, payload);
  return [res.statusCode, res.json().code];
};

describe('@RouteInput({ paramErrors })', () => {
  it('parses every part with the route schemas', async () => {
    const res = await put(`/probe/${ID}/items/abc/2`);
    expect([res.statusCode, res.json()]).toEqual([200, { id: ID, code: 'abc', page: 2 }]);
  });

  it("answers a bad named param with that param's own error", async () => {
    expect(await answer(`/probe/${ID}/items/ABC/2`)).toEqual([400, 'invalid_code']);
    expect(await answer('/probe/nope/items/abc/2')).toEqual([404, 'item_not_found']);
  });

  it('checks the named params in their listed order: the first bad one wins', async () => {
    expect(await answer('/probe/nope/items/ABC/2')).toEqual([400, 'invalid_code']);
  });

  it('lets a named param win over a bad param that is not named', async () => {
    expect(await answer(`/probe/${ID}/items/ABC/0`)).toEqual([400, 'invalid_code']);
  });

  it('still lets a bad body win over a bad named param', async () => {
    const res = await put('/probe/nope/items/ABC/2', {});
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed', issues: [{ path: 'value' }] });
  });

  it('answers the 400 envelope on a bad param that is not named', async () => {
    const res = await put(`/probe/${ID}/items/abc/0`);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed', issues: [{ path: 'page' }] });
  });

  it('answers the 400 envelope on a named param without its own error, on the param', async () => {
    const res = await app.inject({ method: 'GET', url: '/probe/nope/pages/0' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed', issues: [{ path: '' }] });
  });
});
