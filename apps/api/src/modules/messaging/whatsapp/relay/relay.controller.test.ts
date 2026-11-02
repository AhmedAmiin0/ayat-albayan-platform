import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { CRM_SENT, crmFailure } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { RelayController } from './relay.controller';
import { crmMe, fakeLine, fakeRepo, KEY, templateBody } from './relay.fakes';
import { RelayLine } from './relay.line';
import { RelayRepo } from './relay.repo';
import { RelayService } from './relay.service';

// HTTP: the script's own calls (CRM_URL + /api/v1/…) against the relay, all fakes, no network.

const CRM = 'http://127.0.0.1:4010/crm/api/v1';
const ME_URL = `${CRM}/me`;

let app: NestFastifyApplication | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function relayApp(input: {
  fetch?: ReturnType<typeof scriptedFetch>;
  allowed?: readonly string[];
  crm?: boolean;
}) {
  const repo = fakeRepo();
  const f = input.fetch ?? scriptedFetch();
  const line =
    input.crm === false ? { current: () => null } : fakeLine({ fetch: f, allowed: input.allowed });
  const mod = await Test.createTestingModule({
    controllers: [RelayController],
    providers: [
      RelayService,
      { provide: RelayLine, useValue: line },
      { provide: RelayRepo, useValue: repo },
    ],
  }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const http = app;
  const post = (body: unknown, auth: string | null = KEY) =>
    http.inject({
      method: 'POST',
      url: '/script-relay/api/v1/messages',
      payload: JSON.stringify(body),
      headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    });
  const me = (auth: string | null = KEY) =>
    http.inject({
      method: 'GET',
      url: '/script-relay/api/v1/me',
      headers: auth ? { authorization: auth } : {},
    });
  return { repo, f, post, me };
}

describe('script relay HTTP', () => {
  it("GET /me with the line's key: the account and the messages:send scope", async () => {
    const r = await relayApp({});
    const res = await r.me();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      data: {
        account: { name: 'Ayat Al-Bayan platform relay' },
        key: { scopes: ['messages:send'] },
      },
    });
  });

  it('401 {error} for a wrong or missing key; nothing stored or sent', async () => {
    const refused = crmFailure(401, 'unauthorized');
    const r = await relayApp({ fetch: scriptedFetch(refused, refused) });
    for (const auth of ['Bearer wrong', null]) {
      const res = await r.post(templateBody(), auth);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({
        error: { message: 'invalid or missing API key', code: 'unauthorized' },
      });
    }
    expect((await r.me('Bearer wrong')).statusCode).toBe(401);
    expect(r.repo.rows).toEqual([]);
    // Only the key checks (GET /me with the wrong key), no send; a missing key asks nothing.
    expect(r.f.requests.map((q) => q.url)).toEqual([ME_URL, ME_URL]);
  });

  it("the script's own CRM key (same account, messages:send): 201, sent with the line's key", async () => {
    const r = await relayApp({ fetch: scriptedFetch(crmMe(), crmMe(), CRM_SENT) });
    const res = await r.post(templateBody(), 'Bearer script-key');
    expect(res.statusCode).toBe(201);
    expect(r.f.requests.map((q) => q.url)).toEqual([ME_URL, ME_URL, `${CRM}/messages`]);
    expect(r.f.requests[2]?.init.headers).toMatchObject({ authorization: KEY });
  });

  it('503 while the notifications line is not on the crm driver', async () => {
    const r = await relayApp({ crm: false });
    expect((await r.post(templateBody())).statusCode).toBe(503);
    expect((await r.me()).statusCode).toBe(503);
  });

  it('201 {data:{message_id, whatsapp_message_id}} and the CRM got the template by its own name', async () => {
    const r = await relayApp({ fetch: scriptedFetch(CRM_SENT) });
    const res = await r.post(templateBody());
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      data: { message_id: 'row-1', whatsapp_message_id: 'wamid.crm-1' },
    });
    expect(r.f.requests[0]?.url).toBe('http://127.0.0.1:4010/crm/api/v1/messages');
  });

  it('422 {error:{message, code}} for an invalid body', async () => {
    const r = await relayApp({});
    const res = await r.post({ to: 'abc', type: 'text', text: 'x' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({
      error: { code: 'invalid_request', message: expect.stringContaining('to') },
    });
  });

  it('the allow-list refuses before any request (403); nothing kept', async () => {
    const r = await relayApp({ allowed: ['+966500000009'] });
    const res = await r.post(templateBody());
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: { code: 'recipient_not_allowed' } });
    expect(r.f.requests).toEqual([]);
    expect(r.repo.rows).toEqual([]);
  });

  it("a CRM 4xx is answered with the same status and the CRM's code; a 5xx or network error is 502", async () => {
    const r = await relayApp({
      fetch: scriptedFetch(
        crmFailure(400, 'bad_request'),
        crmFailure(503, 'unavailable'),
        new TypeError('fetch failed'),
      ),
    });
    const refused = await r.post(templateBody());
    expect(refused.statusCode).toBe(400);
    expect(refused.json()).toMatchObject({
      error: { code: 'bad_request', message: expect.stringContaining('bad_request') },
    });
    expect((await r.post({ to: '966500000001', type: 'text', text: 'a' })).statusCode).toBe(502);
    expect((await r.post({ to: '966500000001', type: 'text', text: 'b' })).statusCode).toBe(502);
  });
});
