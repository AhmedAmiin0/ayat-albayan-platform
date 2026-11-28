import { defineRoute } from '@ab/core';
import { Controller, Module } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';

const routes = {
  put: defineRoute({
    method: 'PUT',
    path: '/probe/keys/:key',
    params: z.object({ key: z.string().regex(/^[a-z]+$/) }),
    body: z.object({ value: z.string().min(1) }),
    response: z.object({ key: z.string(), value: z.string() }),
  }),
};

@Controller()
class ParamsFirstProbeController {
  @Route(routes.put)
  put(@RouteInput({ paramsFirst: true }) input: RouteInputOf<typeof routes.put>) {
    return { key: input.params.key, value: input.body.value };
  }
}

@Module({ controllers: [ParamsFirstProbeController] })
class ParamsFirstProbeModule {}

let app: NestFastifyApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ParamsFirstProbeModule] }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

const put = (url: string, payload: object) => app.inject({ method: 'PUT', url, payload });

describe('@RouteInput({ paramsFirst: true })', () => {
  it('parses params and body with the route schemas', async () => {
    const res = await put('/probe/keys/promo', { value: 'hi', extra: 1 });
    expect([res.statusCode, res.json()]).toEqual([200, { key: 'promo', value: 'hi' }]);
  });

  it('lets a bad param win over a bad body, its issue on the param itself', async () => {
    const res = await put('/probe/keys/Bad-Key', {});
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed', issues: [{ path: '' }] });
  });

  it('answers the body issue when the param is good', async () => {
    const res = await put('/probe/keys/promo', { value: '' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ issues: [{ path: 'value' }] });
  });
});
