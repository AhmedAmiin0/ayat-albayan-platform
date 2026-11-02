import { Controller, Get, Module, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { badRequest, notFound } from './errors';
import { ZodBody, ZodParam } from './zod-inputs';

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const id = z.uuid();
const body = z.object({ name: z.string().min(1) });
const noList = () => notFound('list_not_found');
const badPhone = () => badRequest('invalid_phone');
const phone = z.string().regex(/^\+\d{8,15}$/);

@Controller('probe')
class ParamProbeController {
  @Get('months/:month')
  plain(@ZodParam('month', month) value: string) {
    return { value };
  }

  @Get('lists/:id')
  coded(@ZodParam('id', id, noList) value: string) {
    return { value };
  }

  @Patch('lists/:id')
  withBody(@ZodParam('id', id, noList) value: string, @ZodBody(body) input: z.output<typeof body>) {
    return { value, ...input };
  }

  @Get('rows/:rowId/months/:month')
  withUuid(@ZodParam('month', month) m: string, @Param('rowId', ParseUUIDPipe) rowId: string) {
    return { m, rowId };
  }

  @Get('lists/:id/phones/:phone')
  two(@ZodParam('phone', phone, badPhone) p: string, @ZodParam('id', id, noList) value: string) {
    return { p, value };
  }
}

@Module({ controllers: [ParamProbeController] })
class ParamProbeModule {}

let app: NestFastifyApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ParamProbeModule] }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

const ID = '0c000000-0000-4000-8000-000000000001';
const get = (url: string) => app.inject({ method: 'GET', url });

describe('ZodParam (docs/36 z2a)', () => {
  it('a valid param reaches the handler parsed (url-decoded)', async () => {
    expect((await get('/probe/months/2026-11')).json()).toEqual({ value: '2026-11' });
    const res = await get(`/probe/lists/${ID}/phones/%2B966501234567`);
    expect(res.json()).toEqual({ p: '+966501234567', value: ID });
  });

  it('a bad param is the one 400 envelope without a route error', async () => {
    const res = await get('/probe/months/2026-13');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: 'validation_failed',
      issues: [{ path: '', message: expect.any(String) }],
    });
  });

  it('a bad param throws the route error when one is given', async () => {
    const res = await get('/probe/lists/nope');
    expect([res.statusCode, res.json()]).toEqual([
      404,
      expect.objectContaining({ code: 'list_not_found', message: 'list_not_found' }),
    ]);
  });

  it('a bad body still wins over a bad param (the old inline check ran after it)', async () => {
    const both = await app.inject({ method: 'PATCH', url: '/probe/lists/nope', payload: {} });
    expect([both.statusCode, both.json().message]).toEqual([400, 'validation_failed']);
    const param = await app.inject({
      method: 'PATCH',
      url: '/probe/lists/nope',
      payload: { name: 'x' },
    });
    expect(param.statusCode).toBe(404);
  });

  it('a bad ParseUUIDPipe param still wins over a bad ZodParam', async () => {
    const res = await get('/probe/rows/nope/months/2026-13');
    expect(res.json()).toMatchObject({ message: 'Validation failed (uuid is expected)' });
  });

  it('of two ZodParams, the later one in the signature fails first', async () => {
    const res = await get('/probe/lists/nope/phones/abc');
    expect([res.statusCode, res.json().code]).toEqual([404, 'list_not_found']);
    const phoneOnly = await get(`/probe/lists/${ID}/phones/abc`);
    expect([phoneOnly.statusCode, phoneOnly.json().code]).toEqual([400, 'invalid_phone']);
  });
});
