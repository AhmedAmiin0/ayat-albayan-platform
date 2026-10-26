import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PERMISSION_RESOLVER, systemResolver } from '../../common/auth/permissions';
import { DB } from '../../common/db/db.module';
import { expoMessages, type ExpoMessage } from '../../common/push/expo-push';
import { PushModule } from '../../common/push/push.module';
import { PUSH_TRANSPORT, type PushTransport } from '../../common/push/push.service';
import { NotificationPolicy } from '../notification-rules/policy/policy';
import { fakePolicy } from '../notification-rules/policy/policy.fakes';

// The Expo transport PushModule provides (common/push): batching + the access token.
// fetch is stubbed: no test ever reaches exp.host.

@Global()
@Module({
  providers: [
    { provide: DB, useValue: {} },
    { provide: PERMISSION_RESOLVER, useValue: systemResolver },
    { provide: NotificationPolicy, useValue: fakePolicy() },
  ],
  exports: [DB, PERMISSION_RESOLVER, NotificationPolicy],
})
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
    vi.stubEnv('EXPO_API_BASE', 'https://exp.host');
    const { fetchMock, bodies } = stubFetch();
    const tokens = Array.from({ length: 150 }, (_, i) => `ExponentPushToken[d${i}]`);
    const tickets = await (await transport())(expoMessages(tokens, { title: 't', body: 'b' }, { kind: 'new_lead' }));
    expect(bodies.map((b) => b.length)).toEqual([100, 50]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://exp.host/--/api/v2/push/send');
    expect(fetchMock.mock.calls[0]?.[1].headers).toMatchObject({
      authorization: 'Bearer expo-test-token',
    });
    // A hung Expo times out instead of piling up sends.
    expect(fetchMock.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
    expect(tickets).toHaveLength(150);
    expect(tickets[149]).toEqual({ status: 'ok', id: 'ticket-ExponentPushToken[d149]' });
  });

  it('EXPO_API_BASE unset (local, e2e): nothing leaves the server, every message gets an error ticket', async () => {
    vi.stubEnv('EXPO_API_BASE', '');
    const { fetchMock } = stubFetch();
    const tickets = await (await transport())(expoMessages(['ExponentPushToken[a]'], { title: 't', body: 'b' }, {}));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tickets).toEqual([{ status: 'error', message: 'push off: EXPO_API_BASE is not set' }]);
  });

  it('an HTTP error throws (PushService logs it, never rethrows)', async () => {
    vi.stubEnv('EXPO_API_BASE', 'https://exp.host');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 502 })));
    const send = await transport();
    await expect(send(expoMessages(['ExponentPushToken[a]'], { title: 't', body: 'b' }, {}))).rejects.toThrow(
      'expo push HTTP 502',
    );
  });
});
