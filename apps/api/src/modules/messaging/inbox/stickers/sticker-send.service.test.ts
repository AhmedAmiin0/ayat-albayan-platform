import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { ForwardFiles } from '@/modules/messaging/inbox/files/forward-files';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { StickerSender } from './sticker-send.service';
import type { StickersService } from './stickers.service';

// A sticker from the panel (owner 2026-11-01): the window first, then the copy and the queue.
const NOW = new Date('2026-10-02T09:00:00Z');
const ACTOR = 'a0000000-0000-4000-8000-000000000001';
const REQ = 'c0000000-0000-4000-8000-000000000001';
const SOURCE = 'b1111111-1111-4111-8111-111111111111';
const file = { path: `out/${ACTOR}/${REQ}/fwd-${SOURCE}.webp`, mime: 'image/webp', name: 'fwd.webp', caption: 'x' };

const threads = { thread: vi.fn(), numberWindows: vi.fn(async () => []), get: vi.fn() };
const files = { copy: vi.fn(), send: vi.fn() };
const stickers = { sticker: vi.fn() };
const sender = new StickerSender(
  stickers as unknown as StickersService,
  threads as unknown as ThreadsRepo,
  files as unknown as ForwardFiles,
);
const input = { messageId: SOURCE, clientRequestId: REQ };
const send = () => sender.send({ phone: PHONE, input, actorId: ACTOR }, NOW);
const code = (e: unknown) => (e as { getResponse(): { code: string } }).getResponse().code;

describe('StickerSender.send', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    threads.thread.mockResolvedValue(threadRow());
    threads.numberWindows.mockResolvedValue([]);
    threads.get.mockResolvedValue({ id: SOURCE });
    stickers.sticker.mockResolvedValue({ id: SOURCE });
    files.copy.mockResolvedValue(file);
    files.send.mockResolvedValue({ view: { id: 'new' }, replayed: false });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('copies the stored sticker and queues it as this staff member’s, with no caption', async () => {
    await expect(send()).resolves.toEqual({ view: { id: 'new' }, replayed: false });
    expect(files.copy).toHaveBeenCalledWith({ id: SOURCE }, { actorId: ACTOR, requestId: REQ });
    const [s, queued] = files.send.mock.calls[0] ?? [];
    expect(s).toMatchObject({ phone: PHONE, actorId: ACTOR, input: { clientRequestId: REQ } });
    expect(queued).toEqual({ ...file, caption: null });
  });

  it('a closed window is 409 session_closed before any copy', async () => {
    threads.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-09-01T08:00:00Z', last_notifications_inbound_at: '2026-09-01T08:00:00Z' }));
    expect(code(await send().catch((e: unknown) => e))).toBe('session_closed');
    expect(files.copy).not.toHaveBeenCalled();
  });

  it('a message that is no sticker is refused before any copy', async () => {
    stickers.sticker.mockRejectedValue(new Error('message_not_found'));
    await expect(send()).rejects.toThrow('message_not_found');
    expect(files.copy).not.toHaveBeenCalled();
  });
});
