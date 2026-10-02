import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DB } from '../../common/db/db.module';
import { EXPO_PUSH_URL, expoMessages, type ExpoMessage } from '../../common/push/expo-push';
import { PushModule } from '../../common/push/push.module';
import { PUSH_TRANSPORT, type PushTransport } from '../../common/push/push.service';

// The Expo transport PushModule provides (common/push): batching + the access token.
// fetch is stubbed: no test ever reaches exp.host.

@Global()
@Module({ providers: [{ provide: DB, useValue: {} }], exports: [DB] })
class FakeDbModule {}

async function transport(): Promise<PushTransport> {
  const mod = await Test.createTestingModule({ imports: [FakeDbModule, PushModule] }).compile();
  return mod.get<PushTransport>(PUSH_TRANSPORT);
}

function stubFetch() {
  const bodies: ExpoMessage[][] = [];
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const batch = JSON.parse(String(init.body)) as ExpoMessage[];
    bodies.push(batch);
    return new Response(JSON.stringify({ data: batch.map((m) => ({ status: 'ok', id: `ticket-${m.to}` })) }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, bodies };
}

describe('PushModule Expo transport (R-MOB-01 push sending)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends in batches of 100 with EXPO_ACCESS_TOKEN; one ticket per message, in order', async () => {
    vi.stubEnv('EXPO_ACCESS_TOKEN', 'expo-test-token');
    const { fetchMock, bodies } = stubFetch();
    const tokens = Array.from({ length: 150 }, (_, i) => `ExponentPushToken[d${i}]`);
    const tickets = await (await transport())(expoMessages(tokens, { title: 't', body: 'b' }, { kind: 'new_lead' }));
    expect(bodies.map((b) => b.length)).toEqual([100, 50]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(EXPO_PUSH_URL);
    expect(fetchMock.mock.calls[0]?.[1].headers).toMatchObject({ authorization: 'Bearer expo-test-token' });
    expect(tickets).toHaveLength(150);
    expect(tickets[149]).toEqual({ status: 'ok', id: 'ticket-ExponentPushToken[d149]' });
  });

  it('an HTTP error throws (PushService logs it, never rethrows)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 502 })));
    const send = await transport();
    await expect(send(expoMessages(['ExponentPushToken[a]'], { title: 't', body: 'b' }, {}))).rejects.toThrow(
      'expo push HTTP 502',
    );
  });
});
