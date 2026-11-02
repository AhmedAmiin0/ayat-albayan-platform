import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { Outbox } from '@/modules/messaging/inbox/send/outbox';
import { ThreadFileSender } from './thread-file-send.service';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';

// A voice note recorded in the app (owner 2026-10-27): m4a in, a WhatsApp ogg/opus voice note out.
const NOW = new Date('2026-10-02T09:00:00Z');
const ACTOR = 's0000000-0000-4000-8000-000000000001';
const REQ = 'c0000000-0000-4000-8000-000000000001';
const PATH = `out/${ACTOR}/${REQ}/a.m4a`;
const OGG_PATH = `out/${ACTOR}/${REQ}/voice.ogg`;
const M4A = Uint8Array.from('\0\0\0\x18ftypisom', (c) => c.charCodeAt(0));
const OGG = new TextEncoder().encode('OggS');

const queries = { thread: vi.fn() };
const outbox = { queue: vi.fn() };
const storage = { info: vi.fn(), head: vi.fn(), download: vi.fn(), upload: vi.fn() };
const toOgg = vi.fn();
const sender = () => {
  const s = new ThreadFileSender(queries as unknown as ThreadsRepo, outbox as unknown as Outbox, storage as unknown as StorageService);
  Object.assign(s, { toOgg });
  return s;
};
const send = (phone = PHONE) =>
  sender().send({ phone, input: { clientRequestId: REQ, path: PATH, filename: 'voice.m4a' }, actorId: ACTOR, sales: { salesId: ACTOR } as never }, NOW);
const sent = () => outbox.queue.mock.calls[0]?.[0] as Record<string, unknown>;

describe('ThreadFileSender.send: a voice note', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    queries.thread.mockResolvedValue(threadRow());
    storage.info.mockResolvedValue({ size: 36_000, contentType: 'audio/mp4' });
    storage.head.mockResolvedValue(M4A);
    storage.download.mockResolvedValue(M4A);
    toOgg.mockResolvedValue(OGG);
    outbox.queue.mockImplementation(async (row: object) => ({ view: { id: 'm1', ...row }, replayed: false }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('the m4a becomes an ogg row for this same phone, the m4a kept', async () => {
    await send();
    expect(toOgg).toHaveBeenCalledWith(M4A);
    expect(storage.upload).toHaveBeenCalledWith({ bucket: 'wa-media', path: OGG_PATH, body: OGG, contentType: 'audio/ogg' });
    expect(sent()).toMatchObject({ phone_e164: PHONE, media_path: OGG_PATH, media_mime: 'audio/ogg', media_name: 'voice.ogg', body: null });
    expect(sent().dedup_key).toBe(`sales:${ACTOR}:${PHONE}:${REQ}`);
  });

  it('without ffmpeg: an m4a row (plain audio), nothing uploaded', async () => {
    toOgg.mockResolvedValue(null);
    await send();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(sent()).toMatchObject({ media_path: PATH, media_mime: 'audio/mp4', media_name: 'voice.m4a' });
  });

  it('a replayed request id returns the first row (the ogg written to the same fixed path)', async () => {
    outbox.queue.mockResolvedValue({ view: { id: 'first' }, replayed: true });
    await expect(send()).resolves.toEqual({ view: { id: 'first' }, replayed: true });
    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ path: OGG_PATH }));
  });

  it('bytes that are not audio stored as audio/mp4: 400 file_type, nothing transcoded', async () => {
    storage.head.mockResolvedValue(new TextEncoder().encode('%PDF-1.7\n   '));
    await expect(send()).rejects.toMatchObject({ status: 400 });
    expect(toOgg).not.toHaveBeenCalled();
    expect(outbox.queue).not.toHaveBeenCalled();
  });

  it('a closed window: 409 before any download or transcode', async () => {
    queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-09-01T08:00:00Z', last_notifications_inbound_at: '2026-09-01T08:00:00Z' }));
    await expect(send()).rejects.toMatchObject({ status: 409 });
    expect(storage.download).not.toHaveBeenCalled();
    expect(toOgg).not.toHaveBeenCalled();
  });

  it('other audio (an ogg uploaded directly) is refused: 400 file_type', async () => {
    storage.info.mockResolvedValue({ size: 36_000, contentType: 'audio/ogg' });
    storage.head.mockResolvedValue(OGG);
    await expect(send()).rejects.toMatchObject({ status: 400 });
    expect(outbox.queue).not.toHaveBeenCalled();
  });
});
