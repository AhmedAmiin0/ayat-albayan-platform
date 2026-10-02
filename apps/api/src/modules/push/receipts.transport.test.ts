import { afterEach, describe, expect, it, vi } from 'vitest';
import { expoReceiptsTransport } from './receipts.transport';

const BASE = 'https://exp.host';

// fetch is always stubbed: no test ever reaches exp.host.
function stubFetch(status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const { ids } = JSON.parse(String(init.body)) as { ids: string[] };
    const data = Object.fromEntries(ids.map((id) => [id, { status: 'ok' }]));
    return new Response(JSON.stringify({ data }), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

describe('expoReceiptsTransport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the ids in batches of 1000 with the access token', async () => {
    const calls = stubFetch();
    const ids = Array.from({ length: 1001 }, (_, i) => `t${i}`);
    const receipts = await expoReceiptsTransport({ base: BASE, accessToken: 'expo-token' })(ids);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe('https://exp.host/--/api/v2/push/getReceipts');
    expect(calls[0]?.init.headers).toMatchObject({ authorization: 'Bearer expo-token' });
    expect((JSON.parse(String(calls[1]?.init.body)) as { ids: string[] }).ids).toEqual(['t1000']);
    expect(Object.keys(receipts)).toHaveLength(1001);
  });

  it('no token → no authorization header', async () => {
    const calls = stubFetch();
    await expoReceiptsTransport({ base: BASE, accessToken: undefined })(['t1']);
    expect(calls[0]?.init.headers).not.toHaveProperty('authorization');
  });

  it('an HTTP error throws (the job logs it and retries next run)', async () => {
    stubFetch(503);
    await expect(expoReceiptsTransport({ base: BASE, accessToken: undefined })(['t1'])).rejects.toThrow('expo receipts HTTP 503');
  });

  it('EXPO_API_BASE unset (local, e2e): no receipts and nothing fetched', async () => {
    const calls = stubFetch();
    await expect(expoReceiptsTransport({ base: undefined, accessToken: 'x' })(['t1'])).resolves.toEqual({});
    expect(calls).toHaveLength(0);
  });
});
