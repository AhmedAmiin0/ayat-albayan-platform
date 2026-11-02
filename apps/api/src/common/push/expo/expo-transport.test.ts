import { afterEach, describe, expect, it, vi } from 'vitest';
import { batchesOf } from './expo-http';
import { ticketsSchema } from './expo-push';
import { expoTransport } from './expo-transport';

// h6 (docs/36): the push send on the Expo profile; tickets parsed by ticketsSchema.
afterEach(() => {
  vi.unstubAllGlobals();
});

const conn = { base: 'https://exp.host', accessToken: undefined };
const message = { to: 'ExponentPushToken[a]', title: 't', body: 'b', data: {}, sound: 'default' as const };
const one = [{ ...message, channelId: 'default' }];

describe('ticketsSchema', () => {
  it('reads data[] as tickets, discriminated on status, extra fields kept', () => {
    const data = [
      { status: 'ok', id: 'T1' },
      { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' }, x: 1 },
    ];
    expect(ticketsSchema.parse({ data })).toEqual(data);
  });

  it('refuses a body without data, an unknown status or an ok ticket without id', () => {
    expect(ticketsSchema.safeParse({}).success).toBe(false);
    expect(ticketsSchema.safeParse({ data: [{ status: 'queued' }] }).success).toBe(false);
    expect(ticketsSchema.safeParse({ data: [{ status: 'ok' }] }).success).toBe(false);
  });
});

describe('expoTransport', () => {
  it('a 2xx that is not a ticket list throws «expo push shape» (PushService logs it)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ errors: [] })));
    await expect(expoTransport(conn)(one)).rejects.toThrow('expo push shape');
  });

  it('a non-JSON 2xx throws too, as res.json() did', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>')));
    await expect(expoTransport(conn)(one)).rejects.toThrow('expo push shape');
  });

  it('no messages: no request, no tickets', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await expoTransport(conn)([])).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('batchesOf', () => {
  it('splits in order, the last batch shorter', () => {
    expect(batchesOf([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(batchesOf([], 100)).toEqual([]);
  });
});
