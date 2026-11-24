import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FOREIGN_MESSAGE,
  FOREIGN_PHONE,
  teachesOwnFamily,
  threadUrl,
} from '@/modules/messaging/inbox/foreign-id.fakes';
import { inboxApp, SALES } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const REQ = 'c0000000-0000-4000-8000-000000000001';
const FAVOURITE = `/threads/stickers/favourites/${FOREIGN_MESSAGE}`;
const sticker = {
  id: FOREIGN_MESSAGE,
  phone_e164: FOREIGN_PHONE,
  direction: 'inbound',
  media_id: 'wa-1',
  media_path: null,
  created_at: new Date().toISOString(),
  interactive_payload: { type: 'sticker', sticker: { sha256: 'abc=' } },
};

describe('sticker and GIF routes with another user\'s ids', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    teachesOwnFamily(t);
    t.stickers.messages.mockResolvedValue([sticker]);
  });

  it('a teacher is 403 on every route, with nothing read, dropped or sent', async () => {
    const url = threadUrl(FOREIGN_PHONE);
    const messageId = FOREIGN_MESSAGE;
    const calls = [
      { method: 'POST' as const, url: `${url}/sticker`, body: { messageId, clientRequestId: REQ } },
      { method: 'POST' as const, url: `${url}/gif`, body: { gifId: 'abc1', clientRequestId: REQ } },
      { method: 'DELETE' as const, url: FAVOURITE },
    ];
    for (const call of calls) {
      const res = await t.call({ ...call, token: 'teacher' });
      expect([res.statusCode, res.json().code]).toEqual([403, 'files_forbidden']);
    }
    expect(t.stickers.messages).not.toHaveBeenCalled();
    expect(t.stickers.drop).not.toHaveBeenCalled();
    expect(t.queries.thread).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a salesperson removing a sticker another staff member saved drops only her own', async () => {
    const res = await t.call({ method: 'DELETE', url: FAVOURITE, token: 'sales' });
    expect(res.statusCode).toBe(204);
    expect(t.stickers.drop).toHaveBeenCalledTimes(1);
    expect(t.stickers.drop).toHaveBeenCalledWith({ profile_id: SALES.id, sticker_key: 'sha:abc=' });
  });

  it('a message that is not a sticker is 404 and nothing is dropped', async () => {
    t.stickers.messages.mockResolvedValue([]);
    const res = await t.call({ method: 'DELETE', url: FAVOURITE, token: 'sales' });
    expect(res.statusCode).toBe(404);
    expect(t.stickers.drop).not.toHaveBeenCalled();
  });
});
