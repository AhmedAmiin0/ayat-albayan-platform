import { Controller, Get, Module, NotFoundException, Post } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbTimeoutError } from './db-timeout';
import { DbTimeoutFilter } from './db-timeout.filter';

@Controller('t')
class ThrowingController {
  @Get('typed')
  typed(): never {
    throw new DbTimeoutError(15_000);
  }

  @Get('repo')
  repo(): never {
    // What a repo throws from postgrest's { error } (new Error(error.message)).
    throw new Error('DbTimeoutError: database call timed out after 15000 ms');
  }

  @Post('write')
  write(): never {
    throw new DbTimeoutError(15_000);
  }

  @Get('other')
  other(): never {
    throw new Error('boom');
  }

  @Get('http')
  http(): never {
    throw new NotFoundException({ code: 'lesson_not_found', message: 'lesson_not_found' });
  }
}

@Module({
  controllers: [ThrowingController],
  providers: [{ provide: APP_FILTER, useClass: DbTimeoutFilter }],
})
class TestModule {}

describe('DbTimeoutFilter (a stalled database call → 503, everything else as before)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [TestModule] }).compile();
    const adapter = new FastifyAdapter();
    app = mod.createNestApplication<NestFastifyApplication>(adapter, { logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it.each(['typed', 'repo'])('%s timeout → 503 db_timeout with Retry-After, no details', async (path) => {
    const res = await app.inject({ method: 'GET', url: `/t/${path}` });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ code: 'db_timeout', message: 'db_timeout' });
    expect(res.headers['retry-after']).toBe('5');
  });

  it('a write that timed out may still commit → 503 db_outcome_unknown: resend the same request id', async () => {
    const res = await app.inject({ method: 'POST', url: '/t/write' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ code: 'db_outcome_unknown', message: 'db_outcome_unknown' });
    expect(res.headers['retry-after']).toBe('5');
  });

  it('any other error is Nest’s usual 500', async () => {
    const res = await app.inject({ method: 'GET', url: '/t/other' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ statusCode: 500, message: 'Internal server error' });
  });

  it('an HttpException keeps its status and body', async () => {
    const res = await app.inject({ method: 'GET', url: '/t/http' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ code: 'lesson_not_found', message: 'lesson_not_found' });
  });
});
