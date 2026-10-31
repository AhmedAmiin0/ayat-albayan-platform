import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Controller, Get, Module, Param } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ClientUsageCounter } from './client-usage.counter';
import { registerClientUsage, UNMATCHED_ROUTE } from './client-usage.hook';

@Controller('things')
class ThingsController {
  @Get(':id')
  one(@Param('id') id: string): { id: string } {
    return { id };
  }
}

@Module({ controllers: [ThingsController] })
class TestModule {}

describe('client usage hook (X-AB-Client × route template)', () => {
  let app: NestFastifyApplication;
  const counter = new ClientUsageCounter();

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
    app.enableCors({ origin: ['https://web.example'] });
    registerClientUsage(app, counter);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => counter.drain());

  it('counts the route template (never the id), the tag and untagged requests, 404s as unmatched', async () => {
    await app.inject({ method: 'GET', url: '/things/123', headers: { 'x-ab-client': 'web/2026.10.23' } });
    await app.inject({ method: 'GET', url: '/things/456', headers: { 'x-ab-client': 'web/2026.10.23' } });
    await app.inject({ method: 'GET', url: '/things/789' });
    await app.inject({ method: 'GET', url: '/things/1', headers: { 'x-ab-client': 'not a tag' } });
    await app.inject({ method: 'GET', url: '/nope/42', headers: { 'x-ab-client': 'android/0.2.0' } });
    expect(counter.drain()).toEqual([
      ['GET /things/:id untagged', 2],
      ['GET /things/:id web/2026.10.23', 2],
      [`GET ${UNMATCHED_ROUTE} android/0.2.0`, 1],
    ]);
  });

  it('CORS preflight allows the X-AB-Client header (no allowedHeaders set → request headers reflected)', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/things/1',
      headers: { origin: 'https://web.example', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization,x-ab-client' },
    });
    expect(res.statusCode).toBeLessThan(300);
    expect(String(res.headers['access-control-allow-headers']).toLowerCase()).toContain('x-ab-client');
  });
});
