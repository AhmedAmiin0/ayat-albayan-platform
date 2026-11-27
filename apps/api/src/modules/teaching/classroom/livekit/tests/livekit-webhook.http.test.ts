import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  LIVEKIT_WEBHOOK_TYPE,
  LivekitWebhookController,
  registerLivekitWebhookParser,
} from '@/modules/teaching/classroom/livekit/livekit-webhook.controller';
import { LivekitWebhookService } from '@/modules/teaching/classroom/livekit/livekit-webhook.service';

describe('POST /livekit/webhook (public, signed by LiveKit)', () => {
  let app: NestFastifyApplication;
  const webhook = { handle: vi.fn(async () => undefined) };
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ controllers: [LivekitWebhookController] })
      .useMocker((token) => (token === LivekitWebhookService ? webhook : undefined))
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    registerLivekitWebhookParser(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it('hands the raw bytes and the signature to the service and answers 200 with no body', async () => {
    const payload = '{"event":"room_finished"}';
    const res = await app.inject({
      method: 'POST',
      url: '/livekit/webhook',
      headers: { 'content-type': LIVEKIT_WEBHOOK_TYPE, authorization: 'signed' },
      payload,
    });
    expect([res.statusCode, res.body]).toEqual([200, '']);
    expect(webhook.handle).toHaveBeenCalledWith({
      rawBody: Buffer.from(payload),
      authorization: 'signed',
    });
  });
});
