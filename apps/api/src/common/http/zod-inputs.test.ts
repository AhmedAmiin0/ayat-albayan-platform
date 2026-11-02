import { Controller, Get, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodBody, ZodQuery } from './zod-inputs';

const body = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'paused']).default('active'),
});
const query = z.object({ page: z.coerce.number().int().min(1).default(1) });

@Controller('probe')
class ProbeController {
  @Post()
  create(@ZodBody(body) input: z.output<typeof body>) {
    return input;
  }

  @Patch()
  update(@ZodBody(body.partial(), { sentOnly: true }) input: Partial<z.output<typeof body>>) {
    return input;
  }

  @Post('empty')
  empty(@ZodBody(query, { orEmpty: true }) input: z.output<typeof query>) {
    return input;
  }

  @Patch(':id')
  byId(@Param('id', ParseUUIDPipe) id: string, @ZodBody(body) input: z.output<typeof body>) {
    return { id, ...input };
  }

  @Get()
  list(@ZodQuery(query) input: z.output<typeof query>) {
    return input;
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

let app: NestFastifyApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

const envelope = (path: string) => ({
  message: 'validation_failed',
  issues: [{ path, message: expect.any(String) }],
});

describe('ZodBody / ZodQuery (docs/36 z1b)', () => {
  it('a valid body reaches the handler parsed, with its defaults', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/probe',
      payload: { name: 'x', extra: 1 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ name: 'x', status: 'active' });
  });

  it('a bad or missing body is the one 400 envelope', async () => {
    const bad = await app.inject({ method: 'POST', url: '/probe', payload: { name: '' } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject(envelope('name'));
    const none = await app.inject({ method: 'POST', url: '/probe' });
    expect(none.statusCode).toBe(400);
    expect(none.json()).toMatchObject({ message: 'validation_failed' });
  });

  it('sentOnly keeps only the keys the client sent', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/probe', payload: { name: 'y' } });
    expect(res.json()).toEqual({ name: 'y' });
  });

  it('orEmpty parses a request with no JSON body as {}', async () => {
    const res = await app.inject({ method: 'POST', url: '/probe/empty' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ page: 1 });
  });

  it('a bad uuid param still wins over a bad body (as when the handler parsed)', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/probe/nope', payload: { name: '' } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'Validation failed (uuid is expected)' });
  });

  it('a query is coerced; a bad one is the one 400 envelope', async () => {
    expect((await app.inject({ method: 'GET', url: '/probe?page=3' })).json()).toEqual({ page: 3 });
    expect((await app.inject({ method: 'GET', url: '/probe' })).json()).toEqual({ page: 1 });
    const bad = await app.inject({ method: 'GET', url: '/probe?page=0' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject(envelope('page'));
  });
});
