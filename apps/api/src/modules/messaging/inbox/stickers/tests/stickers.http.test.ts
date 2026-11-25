import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';
import { ADMIN, inboxApp, TEACHER } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const M1 = 'b1111111-1111-4111-8111-111111111111';
const sticker = {
  id: M1,
  phone_e164: PHONE,
  direction: 'inbound',
  media_id: 'wa-1',
  media_path: null,
  created_at: new Date().toISOString(),
  interactive_payload: { type: 'sticker', sticker: { sha256: 'abc=' } },
};

// Stickers and GIFs in the chat (owner 2026-11-01): the admin and sales only; a teacher is 403.
describe('stickers and GIFs routes', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.stickers.recent.mockResolvedValue([sticker]);
    t.stickers.messages.mockResolvedValue([sticker]);
    t.stickers.favourites.mockResolvedValue([]);
    const linked = { id: 'tch-1', display_name_ar: 'أبرار', phone_e164: null };
    t.teacher.teacher.mockImplementation(async (id: string) => (id === TEACHER.id ? linked : null));
    t.teacher.phones.mockResolvedValue([PHONE]);
  });

  it('GET /threads/stickers: the newest stickers for the admin and sales', async () => {
    for (const token of ['admin', 'sales']) {
      const res = await t.call({ method: 'GET', url: '/threads/stickers', token });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ favourites: [], recent: [{ message_id: M1, phone: PHONE, key: 'sha:abc=' }] });
    }
  });

  it('a teacher gets 403 files_forbidden on every sticker and GIF route', async () => {
    const urls = ['/threads/stickers', '/threads/gifs'];
    for (const url of urls) {
      const res = await t.call({ method: 'GET', url, token: 'teacher' });
      expect([res.statusCode, res.json().code]).toEqual([403, 'files_forbidden']);
    }
    expect(t.stickers.recent).not.toHaveBeenCalled();
  });

  it('PUT …/favourites saves the sticker under the caller; DELETE drops it', async () => {
    const put = await t.call({ method: 'PUT', url: '/threads/stickers/favourites', body: { messageId: M1 } });
    expect(put.statusCode).toBe(204);
    expect(t.stickers.save).toHaveBeenCalledWith({ profile_id: ADMIN.id, sticker_key: 'sha:abc=', message_id: M1 });
    const del = await t.call({ method: 'DELETE', url: `/threads/stickers/favourites/${M1}` });
    expect(del.statusCode).toBe(204);
    expect(t.stickers.drop).toHaveBeenCalledWith({ profile_id: ADMIN.id, sticker_key: 'sha:abc=' });
  });

  it('a body that is not a message id is 400, nothing saved', async () => {
    const res = await t.call({ method: 'PUT', url: '/threads/stickers/favourites', body: { messageId: 'x' } });
    expect(res.statusCode).toBe(400);
    expect(t.stickers.save).not.toHaveBeenCalled();
  });

  it('GET /threads/gifs without a GIPHY key: not configured, no items', async () => {
    const res = await t.call({ method: 'GET', url: '/threads/gifs?q=hello' });
    expect([res.statusCode, res.json()]).toEqual([200, { configured: false, items: [] }]);
  });
});
