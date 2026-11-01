import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { InboxSettings } from '@/modules/messaging/inbox/inbox.settings';
import type { Outbox } from '@/modules/messaging/inbox/send/outbox';
import { ThreadFileSender } from './thread-file-send.service';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';

const NOW = new Date('2026-10-02T09:00:00Z');
const ACTOR = 's0000000-0000-4000-8000-000000000001';
const REQ = 'c0000000-0000-4000-8000-000000000001';
const PATH = `out/${ACTOR}/${REQ}/f.png`;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF = new TextEncoder().encode('%PDF-1.7\n   ');
const MB = 1024 * 1024;

const queries = { thread: vi.fn() };
const outbox = { queue: vi.fn() };
const storage = { info: vi.fn(), head: vi.fn(), signedUpload: vi.fn() };
const sender = (maxMb?: number) => {
  const s = new ThreadFileSender(queries as unknown as ThreadsRepo, outbox as unknown as Outbox, storage as unknown as StorageService);
  if (maxMb !== undefined) Object.assign(s, { settings: { read: async () => ({ upload_max_mb: maxMb }) } satisfies Pick<InboxSettings, 'read'> });
  return s;
};
const input = (over: object = {}) => ({ clientRequestId: REQ, path: PATH, filename: 'الواجب.png', ...over });
const send = (over: object = {}, s = sender()) =>
  s.send({ phone: PHONE, input: input(over), actorId: ACTOR, sales: { salesId: ACTOR } as never }, NOW);
const code = (e: unknown) => (e as { getResponse(): { code: string } }).getResponse().code;
const status = (e: unknown) => (e as { getStatus(): number }).getStatus();

describe('ThreadFileSender.send (owner 2026-10-19 #2)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    queries.thread.mockResolvedValue(threadRow());
    storage.info.mockResolvedValue({ size: 2048, contentType: 'image/png' });
    storage.head.mockResolvedValue(PNG);
    outbox.queue.mockImplementation(async (row: object) => ({ view: { id: 'm1', ...row }, replayed: false }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('queues the file under the actor, with the stamped line, caption as body and Storage’s mime', async () => {
    vi.stubEnv('WA_API_BASE', 'http://wa-stub.test');
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', 'chat-phone');
    vi.stubEnv('WA_CHAT_WABA_ID', 'chat-waba');
    vi.stubEnv('WA_ACCESS_TOKEN', 'token');
    queries.thread.mockResolvedValue(threadRow({ last_chat_inbound_at: '2026-10-02T08:00:00Z' }));
    await send({ caption: 'راجعي الصفحة' });
    expect(outbox.queue).toHaveBeenCalledWith({
      phone_e164: PHONE,
      lead_id: threadRow().lead_id,
      guardian_id: null,
      created_by: ACTOR,
      sent_by_teacher_id: null,
      dedup_key: `sales:${ACTOR}:${PHONE}:${REQ}`,
      body: 'راجعي الصفحة',
      media_path: PATH,
      media_mime: 'image/png',
      media_name: 'الواجب.png',
      line: 'chat',
    });
    expect(storage.info).toHaveBeenCalledWith({ bucket: 'wa-media', path: PATH });
  });

  it('a closed window answers 409 session_closed before any Storage call', async () => {
    queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-09-01T08:00:00Z', last_notifications_inbound_at: '2026-09-01T08:00:00Z' }));
    const e = await send().catch((x: unknown) => x);
    expect([status(e), code(e)]).toEqual([409, 'session_closed']);
    expect(storage.info).not.toHaveBeenCalled();
    expect(storage.head).not.toHaveBeenCalled();
  });

  it('a path of another actor or another request id: 400 file_path, nothing read', async () => {
    for (const path of [`out/other/${REQ}/f.png`, `out/${ACTOR}/other/f.png`, `out/${ACTOR}/${REQ}/x/f.png`, 'f.png']) {
      const e = await send({ path }).catch((x: unknown) => x);
      expect([status(e), code(e)]).toEqual([400, 'file_path']);
    }
    expect(storage.info).not.toHaveBeenCalled();
    expect(outbox.queue).not.toHaveBeenCalled();
  });

  it('nothing uploaded at the path: 400 file_path', async () => {
    storage.info.mockResolvedValue(null);
    expect(code(await send().catch((x: unknown) => x))).toBe('file_path');
  });

  it('bytes that are not what Storage says (a PDF stored as image/png): 400 file_type', async () => {
    storage.head.mockResolvedValue(PDF);
    const e = await send().catch((x: unknown) => x);
    expect([status(e), code(e)]).toEqual([400, 'file_type']);
    expect(outbox.queue).not.toHaveBeenCalled();
  });

  it('a type Meta will not take as an image (WebP): 400 file_type', async () => {
    storage.info.mockResolvedValue({ size: 2048, contentType: 'image/webp' });
    expect(code(await send().catch((x: unknown) => x))).toBe('file_type');
  });

  it('over the limit: 413 file_too_large (an image over 5 MB; a PDF over the academy setting)', async () => {
    storage.info.mockResolvedValue({ size: 6 * MB, contentType: 'image/png' });
    const e = await send().catch((x: unknown) => x);
    expect([status(e), code(e)]).toEqual([413, 'file_too_large']);
    storage.info.mockResolvedValue({ size: 3 * MB, contentType: 'application/pdf' });
    storage.head.mockResolvedValue(PDF);
    expect(code(await send({}, sender(2)).catch((x: unknown) => x))).toBe('file_too_large');
    await expect(send({}, sender())).resolves.toBeTruthy(); // the 10 MB registry default without InboxSettings
  });

  it('a replayed request id returns the first row', async () => {
    outbox.queue.mockResolvedValue({ view: { id: 'first' }, replayed: true });
    await expect(send()).resolves.toEqual({ view: { id: 'first' }, replayed: true });
  });
});

describe('ThreadFileSender.uploadUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    queries.thread.mockResolvedValue(threadRow());
    storage.signedUpload.mockResolvedValue({ bucket: 'wa-media', path: 'p', token: 't', signed_url: 'http://up' });
  });
  const upload = (mime: string, size: number, s = sender()) =>
    s.uploadUrl({ phone: PHONE, input: { clientRequestId: REQ, mime, size } as never, actorId: ACTOR }, NOW);
  afterEach(() => vi.unstubAllEnvs());

  it('signs a wa-media path out/{actor}/{request}/{uuid}.{ext}', async () => {
    await expect(upload('application/pdf', 1000)).resolves.toMatchObject({ signed_url: 'http://up' });
    const [ref] = storage.signedUpload.mock.calls[0] as [{ bucket: string; path: string }];
    expect(ref.bucket).toBe('wa-media');
    expect(ref.path).toMatch(new RegExp(`^out/${ACTOR}/${REQ}/[0-9a-f-]{36}\\.pdf$`));
  });

  it('refuses a wrong type (400) or a too large file (413) before signing', async () => {
    const e1 = await upload('image/heic', 1000).catch((x: unknown) => x);
    const e2 = await upload('image/jpeg', 6 * MB).catch((x: unknown) => x);
    expect([status(e1), code(e1), status(e2), code(e2)]).toEqual([400, 'file_type', 413, 'file_too_large']);
    expect(storage.signedUpload).not.toHaveBeenCalled();
  });

  it('a closed window or no thread: 409 session_closed, nothing signed (no orphan upload)', async () => {
    queries.thread.mockResolvedValueOnce(threadRow({ last_inbound_at: '2026-09-01T08:00:00Z', last_notifications_inbound_at: '2026-09-01T08:00:00Z' }));
    queries.thread.mockResolvedValueOnce(null);
    for (let i = 0; i < 2; i++) {
      const e = await upload('image/png', 1000).catch((x: unknown) => x);
      expect([status(e), code(e)]).toEqual([409, 'session_closed']);
    }
    expect(queries.thread).toHaveBeenCalledWith(PHONE);
    expect(storage.signedUpload).not.toHaveBeenCalled();
  });
});
