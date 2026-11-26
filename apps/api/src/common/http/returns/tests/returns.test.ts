import { Controller, Get, HttpCode, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ResponseCheckInterceptor, Returns, returnsOf } from '@/common/http/returns';

const item = z.object({ id: z.string(), size: z.number().int() });

@Controller('probe-returns')
class ReturnsProbeController {
  @Get('fits')
  @Returns(item)
  fits(): { id: string; size: number } {
    return { id: 'a', size: 1 };
  }

  @Get('extra')
  @Returns(item)
  extra(): { id: string; size: number } {
    return { id: 'a', size: 1, ...{ storage_path: 'secret/a.pdf' } };
  }

  @Get('wrong')
  @Returns(item)
  async wrong(): Promise<{ id: string; size: number }> {
    return { id: 'a', size: 1.5 };
  }

  @Get('dates')
  @Returns(z.object({ at: z.string() }))
  dates(): { at: string } {
    return { at: '2026-11-26T10:00:00.000Z' };
  }

  @Get('bare')
  bare(): { anything: boolean } {
    return { anything: true };
  }

  @Get('none')
  @HttpCode(204)
  none(): void {}
}

@Module({
  controllers: [ReturnsProbeController],
  providers: [{ provide: APP_INTERCEPTOR, useFactory: () => new ResponseCheckInterceptor(true) }],
})
class ReturnsProbeModule {}

let app: NestFastifyApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ReturnsProbeModule] }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

const get = (path: string) => app.inject({ method: 'GET', url: `/probe-returns/${path}` });

describe('@Returns with the response check on', () => {
  it('passes a body that fits its schema unchanged', async () => {
    const res = await get('fits');
    expect([res.statusCode, res.json()]).toEqual([200, { id: 'a', size: 1 }]);
  });

  it('answers 500 response_contract for a key the schema does not declare', async () => {
    const res = await get('extra');
    expect([res.statusCode, res.json()]).toEqual([
      500,
      { code: 'response_contract', message: 'response_contract' },
    ]);
  });

  it('answers 500 response_contract for a wrongly typed field', async () => {
    const res = await get('wrong');
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([500, 'response_contract']);
  });

  it('skips handlers without @Returns and 204 handlers', async () => {
    expect((await get('bare')).json()).toEqual({ anything: true });
    expect((await get('none')).statusCode).toBe(204);
  });

  it('compares the wire form, as JSON.stringify sends it', async () => {
    expect((await get('dates')).statusCode).toBe(200);
  });

  it('keeps the schema on the handler for the contract snapshot', () => {
    expect(returnsOf(ReturnsProbeController.prototype.fits)).toBeDefined();
    expect(returnsOf(ReturnsProbeController.prototype.bare)).toBeUndefined();
  });
});

describe('ResponseCheckInterceptor switch', () => {
  it('is on only for API_CHECK_RESPONSES=1', () => {
    expect(ResponseCheckInterceptor.fromEnv({ API_CHECK_RESPONSES: '1' }).on).toBe(true);
    expect(ResponseCheckInterceptor.fromEnv({ API_CHECK_RESPONSES: 'true' }).on).toBe(false);
    expect(ResponseCheckInterceptor.fromEnv({}).on).toBe(false);
  });
});
