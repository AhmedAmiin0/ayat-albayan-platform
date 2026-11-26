import { Controller, Get, HttpException, Module, NotFoundException } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ErrorCodeFilter } from '@/common/http/error-code';

@Controller('t')
class ThrowingController {
  @Get('default')
  nestDefault(): never {
    throw new NotFoundException();
  }

  @Get('message')
  message(): never {
    throw new HttpException({ message: 'no_line' }, 409);
  }

  @Get('coded')
  coded(): never {
    throw new HttpException({ code: 'lesson_not_found', message: 'lesson_not_found' }, 404);
  }

  @Get('unknown')
  unknown(): never {
    throw new Error('boom');
  }
}

@Module({
  controllers: [ThrowingController],
  providers: [{ provide: APP_FILTER, useClass: ErrorCodeFilter }],
})
class TestModule {}

describe('ErrorCodeFilter: the code beside every answered error', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [TestModule] }).compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it.each([
    ['default', 404, { statusCode: 404, message: 'Not Found', code: 'not_found' }],
    ['message', 409, { message: 'no_line', code: 'no_line' }],
    ['coded', 404, { code: 'lesson_not_found', message: 'lesson_not_found' }],
    [
      'unknown',
      500,
      { statusCode: 500, message: 'Internal server error', code: 'internal_server_error' },
    ],
  ])('%s', async (path, status, body) => {
    const res = await app.inject({ method: 'GET', url: `/t/${path}` });
    expect(res.statusCode).toBe(status);
    expect(res.json()).toEqual(body);
  });
});
