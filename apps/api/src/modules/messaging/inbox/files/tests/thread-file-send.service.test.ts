import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import {
  ACTOR,
  code,
  MB,
  outbox,
  PATH,
  PDF,
  PNG,
  queries,
  REQ,
  send,
  sender,
  status,
  storage,
} from './fixtures/file-sender.fixture';

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
    // the 10 MB registry default without InboxSettings
    await expect(send({}, sender())).resolves.toBeTruthy();
  });

  it('a replayed request id returns the first row', async () => {
    outbox.queue.mockResolvedValue({ view: { id: 'first' }, replayed: true });
    await expect(send()).resolves.toEqual({ view: { id: 'first' }, replayed: true });
  });
});
