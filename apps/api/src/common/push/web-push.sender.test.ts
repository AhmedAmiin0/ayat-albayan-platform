import { createECDH, randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { decryptPayload } from './web-push.crypto';
import { WebPushSender, type WebPushTransport } from './web-push.sender';
import type { VapidKeys } from './web-push.vapid';

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

function browser() {
  const ua = createECDH('prime256v1');
  ua.generateKeys();
  const auth = randomBytes(16);
  return { ua, auth, keys: { p256dh: ua.getPublicKey('base64url'), auth: auth.toString('base64url') } };
}

function fakeDb(subs: Sub[]) {
  const deleted: string[] = [];
  const from = vi.fn(() => ({
    select: () => ({ eq: async () => ({ data: subs, error: null }) }),
    delete: () => ({ eq: async (_c: string, id: string) => (deleted.push(id), { error: null }) }),
  }));
  return { db: { from } as unknown as Db, deleted };
}

const vapid = (): VapidKeys => {
  const e = createECDH('prime256v1');
  e.generateKeys();
  return { publicKey: e.getPublicKey('base64url'), privateKey: e.getPrivateKey('base64url'), subject: 'mailto:ops@example.com' };
};
const PAYLOAD = { title: 'طالب جديد في حلقاتك', body: 'x'.repeat(300), url: '/teacher/calendar', tag: 'new_student:l1' };
const FCM = 'https://fcm.googleapis.com/fcm/send/abc';

describe('WebPushSender (R-NOT-02)', () => {
  it('off (no WEB_PUSH_* keys): no read, no transport call', async () => {
    const { db } = fakeDb([]);
    const transport = vi.fn<WebPushTransport>();
    expect(await new WebPushSender(db, transport, () => null).send('p1', PAYLOAD)).toBe(0);
    expect(transport).not.toHaveBeenCalled();
    expect(db.from).not.toHaveBeenCalled();
  });

  it('posts an encrypted aes128gcm body with VAPID, TTL 86400; the browser reads a clipped body', async () => {
    const b = browser();
    const { db } = fakeDb([{ id: 's1', endpoint: FCM, ...b.keys }]);
    const transport = vi.fn<WebPushTransport>(async () => ({ status: 201 }));
    expect(await new WebPushSender(db, transport, vapid).send('p1', PAYLOAD)).toBe(1);
    const req = transport.mock.calls[0]?.[0];
    expect(req?.url).toBe(FCM);
    expect(req?.headers).toMatchObject({ 'content-encoding': 'aes128gcm', ttl: '86400' });
    expect(req?.headers['authorization']).toMatch(/^vapid t=.+, k=.+$/);
    const shown = JSON.parse(decryptPayload(req?.body ?? Buffer.alloc(0), { privateKey: b.ua.getPrivateKey(), auth: b.auth }).toString()) as typeof PAYLOAD;
    expect(shown).toMatchObject({ title: PAYLOAD.title, url: '/teacher/calendar', tag: 'new_student:l1' });
    expect(shown.body).toHaveLength(240);
  });

  it('400/403/404/410/413 delete the subscription; 401, 429 and 500 keep it', async () => {
    const subs = ['s400', 's401', 's403', 's404', 's410', 's413', 's429', 's500'].map((id) => ({
      id,
      endpoint: `${FCM}/${id}`,
      ...browser().keys,
    }));
    const { db, deleted } = fakeDb(subs);
    const transport: WebPushTransport = async ({ url }) => ({ status: Number(url.slice(-3)) });
    expect(await new WebPushSender(db, transport, vapid).send('p1', PAYLOAD)).toBe(0);
    expect([...deleted].sort()).toEqual(['s400', 's403', 's404', 's410', 's413']);
  });

  it('an endpoint off the allow-list is never contacted and is deleted', async () => {
    const { db, deleted } = fakeDb([{ id: 'bad', endpoint: 'https://127.0.0.1:3000/x', ...browser().keys }]);
    const transport = vi.fn<WebPushTransport>();
    await new WebPushSender(db, transport, vapid).send('p1', PAYLOAD);
    expect(transport).not.toHaveBeenCalled();
    expect(deleted).toEqual(['bad']);
  });

  it('never throws: a network error or a broken key is only logged', async () => {
    const { db, deleted } = fakeDb([{ id: 's1', endpoint: FCM, ...browser().keys }]);
    const down: WebPushTransport = async () => {
      throw new Error('ECONNRESET');
    };
    await expect(new WebPushSender(db, down, vapid).send('p1', PAYLOAD)).resolves.toBe(0);
    await expect(new WebPushSender(db, down, () => ({ ...vapid(), publicKey: 'x' })).send('p1', PAYLOAD)).resolves.toBe(0);
    expect(deleted).toEqual([]);
  });
});
