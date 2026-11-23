import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { DB } from '@/common/db/db.module';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { RelayController } from './relay.controller';
import { countingLimitDb, fakeLine, fakeRepo, KEY } from './relay.fakes';
import { RELAY_PER_MINUTE, RelayLimit } from './relay.limit';
import { RelayLine } from './relay.line';
import { RelayRepo } from './relay.repo';
import { RelayService } from './relay.service';

// The relay's per-IP budget through the real RateLimitRepo over an in-memory rate_limit_take.

let app: NestFastifyApplication | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function limitedApp() {
  const mod = await Test.createTestingModule({
    controllers: [RelayController],
    providers: [
      RelayService,
      RelayLimit,
      RateLimitRepo,
      { provide: DB, useValue: countingLimitDb() },
      { provide: RelayLine, useValue: fakeLine({ fetch: scriptedFetch() }) },
      { provide: RelayRepo, useValue: fakeRepo() },
    ],
  }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const http = app;
  return (ip: string) =>
    http.inject({
      method: 'GET',
      url: '/script-relay/api/v1/me',
      remoteAddress: ip,
      headers: { authorization: KEY },
    });
}

describe('script relay rate limit', () => {
  it('one IP past the minute budget gets 429; another IP is still served', async () => {
    const me = await limitedApp();
    const codes: number[] = [];
    for (let i = 0; i < RELAY_PER_MINUTE; i += 1) codes.push((await me('10.0.0.1')).statusCode);
    expect(new Set(codes)).toEqual(new Set([200]));
    const over = await me('10.0.0.1');
    expect(over.statusCode).toBe(429);
    expect(over.json()).toMatchObject({ code: 'too_many_requests' });
    expect((await me('10.0.0.2')).statusCode).toBe(200);
  });

  it('the POST route is limited by the same bucket', async () => {
    const me = await limitedApp();
    for (let i = 0; i < RELAY_PER_MINUTE; i += 1) await me('10.0.0.3');
    const post = await app?.inject({
      method: 'POST',
      url: '/script-relay/api/v1/messages',
      remoteAddress: '10.0.0.3',
      payload: '{}',
      headers: { authorization: KEY, 'content-type': 'application/json' },
    });
    expect(post?.statusCode).toBe(429);
  });
});
