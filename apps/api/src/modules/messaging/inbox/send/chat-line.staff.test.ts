import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { ForwardFiles } from '@/modules/messaging/inbox/files/forward-files';
import { ThreadFileSender } from '@/modules/messaging/inbox/files/thread-file-send.service';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import type { Outbox } from './outbox';

// Owner 2026-11-01 «do the same as the messages»: files, receipts, stickers and forwards leave on a
// text's line (chatLine). Fakes only: no Kapso, no Meta, no Storage.

const NOW = new Date('2026-11-01T10:00:00Z');
const ACTOR = 's0000000-0000-4000-8000-000000000001';
const REQ = 'c0000000-0000-4000-8000-000000000001';
const old = '2026-10-29T10:00:00Z';
const closed = threadRow({ last_inbound_at: old, last_notifications_inbound_at: old });
const LINES = {
  WA_API_BASE: 'http://wa-stub.test',
  WA_PHONE_NUMBER_ID: 'n-phone',
  WA_WABA_ID: 'n-waba',
  WA_ACCESS_TOKEN: 'meta-token-fake',
  WA_CHAT_PHONE_NUMBER_ID: 'c-phone',
  WA_CHAT_WABA_ID: 'c-waba',
  KAPSO_API_BASE: 'http://wa-stub.test/kapso',
  KAPSO_API_KEY: 'kapso-key-fake',
};
const chatOn = (provider: 'meta' | 'kapso') => {
  for (const [k, v] of Object.entries({ ...LINES, WA_CHAT_PROVIDER: provider })) vi.stubEnv(k, v);
};
const queries = { thread: vi.fn(), numberWindows: vi.fn() };
const outbox = { queue: vi.fn() };
const storage = { signedUpload: vi.fn() };
const kapso = { reopen: vi.fn() };
const repo = queries as unknown as ThreadsRepo;
const box = outbox as unknown as Outbox;
const store = storage as unknown as StorageService;
const file = { path: `out/${ACTOR}/${REQ}/r.png`, mime: 'image/png', name: 'r.png', caption: null };
const forwardFiles = () => {
  const f = new ForwardFiles(repo, box, store);
  Object.assign(f, { kapso });
  return f;
};
const teacher = { teacherId: 't1', teacherName: 'أ', phones: new Set([PHONE]), ownPhone: null };
const code = (e: unknown) => (e as { getResponse(): { code: string } }).getResponse().code;

describe('a staff file after the 24 h window, as a text', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.thread.mockResolvedValue(closed);
    queries.numberWindows.mockResolvedValue([]);
    outbox.queue.mockImplementation(async (row: object) => ({ view: { id: 'm1', ...row }, replayed: false }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('kapso chat line: Kapso reopened, then one row from the chat line', async () => {
    chatOn('kapso');
    const s = { phone: PHONE, input: { clientRequestId: REQ }, actorId: ACTOR };
    await forwardFiles().send(s, file, NOW);
    expect(kapso.reopen).toHaveBeenCalledExactlyOnceWith(PHONE);
    expect(outbox.queue).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ media_path: file.path, line: 'chat', dedup_key: `admin:${PHONE}:${REQ}` }),
    );
  });

  it('a meta chat line: 409 session_closed as before, nothing queued', async () => {
    chatOn('meta');
    const s = { phone: PHONE, input: { clientRequestId: REQ }, actorId: ACTOR };
    const e = await forwardFiles().send(s, file, NOW).catch((x: unknown) => x);
    expect(code(e)).toBe('session_closed');
    expect(outbox.queue).not.toHaveBeenCalled();
  });

  it('teacher mode keeps 409 session_closed (docs/19)', async () => {
    chatOn('kapso');
    const s = { phone: PHONE, input: { clientRequestId: REQ }, actorId: ACTOR, scope: teacher };
    const e = await forwardFiles().send(s, file, NOW).catch((x: unknown) => x);
    expect(code(e)).toBe('session_closed');
    expect(kapso.reopen).not.toHaveBeenCalled();
  });

  it('the upload URL is signed after the window on Kapso, with no reopen yet', async () => {
    chatOn('kapso');
    storage.signedUpload.mockResolvedValue({ path: 'p', token: 't', signedUrl: 'u' });
    const sender = new ThreadFileSender(repo, box, store);
    Object.assign(sender, { kapso });
    const input = { clientRequestId: REQ, mime: 'image/png' as const, size: 2048 };
    await sender.uploadUrl({ phone: PHONE, input, actorId: ACTOR }, NOW);
    expect(storage.signedUpload).toHaveBeenCalledOnce();
    expect(kapso.reopen).not.toHaveBeenCalled();
  });
});
