import { describe, expect, it } from 'vitest';
import { meNotificationRoutes, webPushRoutes } from '../me-push.routes';

const ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'new_lead',
  title: 'عميل جديد',
  body: 'رسالة',
  data: { phone: '+966500000001' },
  created_at: '2026-11-27T21:00:00.123+00:00',
  read_at: null,
};
const PAGE = { items: [ROW], total: 1, page: 1, pageSize: 20, unread: 1 };

describe('meNotificationRoutes and webPushRoutes', () => {
  it('keep the method, path, permission and tag the api serves today', () => {
    const table = { ...meNotificationRoutes, ...webPushRoutes };
    const seen = Object.values(table).map((r) => [r.method, r.path, r.permissions, r.tags]);
    const access = [['notifications.push'], ['me']];
    expect(seen).toEqual([
      ['GET', '/me/notifications', ...access],
      ['POST', '/me/notifications/read', ...access],
      ['GET', '/me/web-push/key', ...access],
      ['DELETE', '/me/web-push', ...access],
    ]);
  });

  it('page the bell 20 at a time, 50 at most', () => {
    const { query } = meNotificationRoutes.list;
    expect(query.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(query.safeParse({ pageSize: '51' }).success).toBe(false);
  });

  it('answer the page with its unread badge and refuse an unknown kind', () => {
    const { response } = meNotificationRoutes.list;
    expect(response.parse(PAGE)).toEqual(PAGE);
    expect(response.safeParse({ ...PAGE, unread: undefined }).success).toBe(false);
    const odd = { ...PAGE, items: [{ ...ROW, kind: 'not_a_kind' }] };
    expect(response.safeParse(odd).success).toBe(false);
  });

  it('mark the given ids, or every unread row when none are given', () => {
    const { body, response } = meNotificationRoutes.read;
    expect(body.parse(undefined)).toBeUndefined();
    expect(body.parse({})).toEqual({});
    expect(body.parse({ ids: [ROW.id] })).toEqual({ ids: [ROW.id] });
    expect(body.safeParse({ ids: [] }).success).toBe(false);
    expect(body.safeParse({ ids: [ROW.id], all: true }).success).toBe(false);
    expect(response).toBe('empty');
  });

  it('answer the browser key, null when browser push is off', () => {
    const { response } = webPushRoutes.key;
    expect(response.parse({ publicKey: null })).toEqual({ publicKey: null });
    expect(response.parse({ publicKey: 'BAbc' })).toEqual({ publicKey: 'BAbc' });
    expect(response.safeParse({}).success).toBe(false);
  });

  it('remove one browser by its endpoint', () => {
    const { query, response } = webPushRoutes.unsubscribe;
    const endpoint = 'https://fcm.googleapis.com/fcm/send/x';
    expect(query.parse({ endpoint })).toEqual({ endpoint });
    expect(query.safeParse({ endpoint: '' }).success).toBe(false);
    expect(response).toBe('empty');
  });
});
