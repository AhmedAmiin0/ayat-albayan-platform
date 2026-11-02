import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { Outbox } from '@/modules/messaging/inbox/send/outbox';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { GifService, gifPath } from './gif.service';

// The GIF tab (owner 2026-11-01): GIPHY is a fake transport here, never called for real.
const NOW = new Date('2026-10-02T09:00:00Z');
const ACTOR = 'a0000000-0000-4000-8000-000000000001';
const REQ = 'c0000000-0000-4000-8000-000000000001';
const MP4 = 'https://media.giphy.com/media/x9/giphy.mp4';
const still = { url: 'https://media.giphy.com/x9/200w.gif', width: '200', height: '150', mp4: MP4 };
const one = { data: { id: 'x9', title: 'شكرًا', images: { fixed_width: still, original: { mp4: MP4 } } } };

const threads = { thread: vi.fn(), numberWindows: vi.fn() };
const outbox = { queue: vi.fn() };
const storage = { upload: vi.fn() };
const transport = vi.fn();
const gifs = (key: string | null = 'k1') => {
  const repo = threads as unknown as ThreadsRepo;
  const s = new GifService(repo, outbox as unknown as Outbox, storage as unknown as StorageService);
  Object.assign(s, { fetch: transport, key: () => key ?? undefined });
  return s;
};
const send = (s = gifs()) => s.send({ phone: PHONE, input: { gifId: 'x9', clientRequestId: REQ }, actorId: ACTOR }, NOW);
const status = (e: unknown) => (e as { getStatus(): number }).getStatus();

describe('GifService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    threads.thread.mockResolvedValue(threadRow());
    threads.numberWindows.mockResolvedValue([]);
    outbox.queue.mockImplementation(async (row: object) => ({ view: { id: 'g1', ...row }, replayed: false }));
    transport
      .mockResolvedValueOnce(new Response(JSON.stringify(one)))
      .mockResolvedValueOnce(new Response(new Uint8Array([7]), { headers: { 'content-type': 'video/mp4' } }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('without a GIPHY key the list says so and asks nothing', async () => {
    const none = { configured: false, items: [] };
    await expect(gifs(null).list(undefined)).resolves.toEqual(none);
    expect(transport).not.toHaveBeenCalled();
  });

  it('keeps the mp4 in wa-media/out/… and queues it as a GIF video under the actor', async () => {
    await send();
    const path = gifPath({ actorId: ACTOR, requestId: REQ });
    expect(path).toBe(`out/${ACTOR}/${REQ}/gif.mp4`);
    expect(storage.upload).toHaveBeenCalledWith({ bucket: 'wa-media', path, body: new Uint8Array([7]), contentType: 'video/mp4' });
    expect(outbox.queue).toHaveBeenCalledWith(expect.objectContaining({
      created_by: ACTOR,
      dedup_key: `admin:${PHONE}:${REQ}`,
      body: null,
      media_path: path,
      media_mime: 'video/mp4',
      interactive_payload: { type: 'gif' },
    }));
  });

  it('a closed window is 409 before GIPHY or Storage', async () => {
    threads.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-09-01T08:00:00Z', last_notifications_inbound_at: '2026-09-01T08:00:00Z' }));
    expect(status(await send().catch((e: unknown) => e))).toBe(409);
    expect(transport).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('no key: 503 giphy_not_configured, nothing stored', async () => {
    expect(status(await send(gifs(null)).catch((e: unknown) => e))).toBe(503);
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
