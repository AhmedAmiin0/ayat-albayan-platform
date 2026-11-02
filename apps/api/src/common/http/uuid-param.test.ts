import { Controller, Get, Module, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { badRequest } from './errors';
import { UuidParam, uuidOf } from './uuid-param';
import { ZodBody, ZodParam } from './zod-inputs';

const body = z.object({ name: z.string().min(1) });
const badPhone = () => badRequest('invalid_phone');
const phone = z.string().regex(/^\+\d{8,15}$/);

@Controller('uuid-probe')
class UuidProbeController {
  @Get('a/:id')
  one(@UuidParam('id') id: string) {
    return { id };
  }

  @Get('nest/:id')
  nest(@Param('id', ParseUUIDPipe) id: string) {
    return { id };
  }

  @Patch('a/:id')
  withBody(@UuidParam('id') id: string, @ZodBody(body) input: z.output<typeof body>) {
    return { id, ...input };
  }

  @Get('a/:id/phones/:phone')
  withPhone(@UuidParam('id') id: string, @ZodParam('phone', phone, badPhone) p: string) {
    return { id, p };
  }

  @Get('a/:id/b/:otherId')
  two(@UuidParam('id') id: string, @UuidParam('otherId') otherId: string) {
    return { id, otherId };
  }
}

@Module({ controllers: [UuidProbeController] })
class UuidProbeModule {}

let app: NestFastifyApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [UuidProbeModule] }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

const ID = '0c000000-0000-4000-8000-000000000001';
const get = (url: string) => app.inject({ method: 'GET', url });
const bad = (path: string) => ({
  message: 'validation_failed',
  issues: [{ path, message: 'invalid_uuid' }],
});

describe('UuidParam (docs/36 z2b)', () => {
  it.each([ID, 'A0000000-0000-0000-0000-00000000000F', '00000000-0000-0000-0000-000000000000'])(
    '%s is accepted, as ParseUUIDPipe accepted it',
    async (id) => {
      expect((await get(`/uuid-probe/a/${id}`)).json()).toEqual({ id });
      expect((await get(`/uuid-probe/nest/${id}`)).statusCode).toBe(200);
    },
  );

  it.each(['nope', `${ID}0`, 'g0000000-0000-4000-8000-000000000001', `{${ID}}`])(
    '%s is the 400 envelope (ParseUUIDPipe refused it too)',
    async (id) => {
      const res = await get(`/uuid-probe/a/${encodeURIComponent(id)}`);
      expect([res.statusCode, res.json()]).toEqual([400, bad('id')]);
      expect((await get(`/uuid-probe/nest/${encodeURIComponent(id)}`)).statusCode).toBe(400);
    },
  );

  it('a bad id wins over a bad body, as ParseUUIDPipe did', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/uuid-probe/a/nope', payload: {} });
    expect(res.json()).toEqual(bad('id'));
  });

  it('a bad id wins over a bad ZodParam', async () => {
    expect((await get('/uuid-probe/a/nope/phones/abc')).json()).toEqual(bad('id'));
    expect((await get(`/uuid-probe/a/${ID}/phones/abc`)).json().code).toBe('invalid_phone');
  });

  it('of two uuid params, the later one in the signature fails first', async () => {
    expect((await get('/uuid-probe/a/nope/b/nope')).json()).toEqual(bad('otherId'));
    expect((await get(`/uuid-probe/a/nope/b/${ID}`)).json()).toEqual(bad('id'));
  });
});

describe('uuidOf', () => {
  it('returns the id, or throws the envelope named after the param', () => {
    expect(uuidOf('messageId', ID)).toBe(ID);
    expect(() => uuidOf('messageId', undefined)).toThrow(expect.objectContaining({
      response: bad('messageId'),
    }));
  });
});
