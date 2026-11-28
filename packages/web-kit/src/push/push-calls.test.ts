import { mockCall } from '@ab/testing/mock-call';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { markRead, notificationsQuery } from './notifications-api';
import { deleteWebPush, saveWebPush, webPushKeyQuery } from './web-push-api';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/x';
const KEYS = { p256dh: `B${'A'.repeat(86)}`, auth: 'A'.repeat(22) };

const fetched: QueryClient['query'] = (options) => new QueryClient().query(options);

beforeEach(() => mockApi.reset());

describe('the bell calls', () => {
  it('read the newest 20 rows', async () => {
    const page = { items: [], total: 0, page: 1, pageSize: 20, unread: 0 };
    mockApi.answer('GET', '/me/notifications', page);
    await expect(fetched(notificationsQuery)).resolves.toEqual(page);
    expect(mockApi.reads()).toEqual([
      { method: 'GET', path: '/me/notifications?page=1&pageSize=20' },
    ]);
  });

  it('mark the given ids, or every unread row with an empty body', async () => {
    await markRead(['n1']);
    await markRead();
    expect(mockApi.writes().map((w) => w.body)).toEqual([{ ids: ['n1'] }, {}]);
  });
});

describe('the browser push calls', () => {
  it('read the server key', async () => {
    mockApi.answer('GET', '/me/web-push/key', { publicKey: null });
    await expect(fetched(webPushKeyQuery)).resolves.toEqual({ publicKey: null });
  });

  it('save this browser with PUT and remove it by its endpoint', async () => {
    const sub = { endpoint: ENDPOINT, expirationTime: null, keys: KEYS };
    await saveWebPush(sub);
    await deleteWebPush(ENDPOINT);
    expect(mockApi.writes()).toEqual([
      { method: 'PUT', path: '/me/web-push', body: sub },
      { method: 'DELETE', path: `/me/web-push?endpoint=${encodeURIComponent(ENDPOINT)}` },
    ]);
  });

  it('send nothing for a subscription the API would refuse', async () => {
    const sub = { endpoint: 'https://127.0.0.1/x', keys: KEYS };
    await expect(saveWebPush(sub)).rejects.toThrow();
    expect(mockApi.writes()).toEqual([]);
  });
});
