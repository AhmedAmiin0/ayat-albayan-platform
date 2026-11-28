import type { Readiness } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { ReadinessService } from './readiness.service';
import { ReadyController } from './ready.controller';
import { IS_PUBLIC, OWN_PUBLIC } from '@/common/auth/decorators';
import { HealthController } from './health.controller';

const view = (status: Readiness['status']): Readiness => ({
  status,
  checks: { database: { status: 'ok', ms: 1 }, redis: { status: 'off' }, jobs: { status: 'off', stale: 0 } },
});

let app: NestFastifyApplication | undefined;

async function boot(answer: Readiness): Promise<NestFastifyApplication> {
  const mod = await Test.createTestingModule({
    controllers: [ReadyController],
    providers: [{ provide: ReadinessService, useValue: { check: async () => answer } }],
  }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('GET /ready (public, no token)', () => {
  afterEach(() => app?.close());

  it.each(['ok', 'degraded'] as const)('%s → 200 with the checks', async (status) => {
    const res = await (await boot(view(status))).inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(view(status));
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('down → 503 with the same body shape', async () => {
    const res = await (await boot(view('down'))).inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual(view('down'));
  });
});

describe('probe access', () => {
  const probes = [HealthController, ReadyController].map((probe): object =>
    Object(Reflect.get(probe.prototype, 'check')),
  );

  it('opens both probes from their route objects, with no @Public of their own', () => {
    const marksOf = (probe: object) =>
      [IS_PUBLIC, OWN_PUBLIC].map((key) => Reflect.getOwnMetadata(key, probe));
    const marks = probes.map(marksOf);
    expect(marks).toEqual([
      [true, undefined],
      [true, undefined],
    ]);
  });
});
