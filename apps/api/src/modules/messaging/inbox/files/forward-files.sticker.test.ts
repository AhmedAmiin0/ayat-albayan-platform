import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { Outbox } from '@/modules/messaging/inbox/send/outbox';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { ForwardFiles } from './forward-files';

// Owner 2026-11-01: a sticker's copy keeps WhatsApp's sha256, so the sticker panel lists it once.
const ACTOR = 'a0000000-0000-4000-8000-000000000001';
const sticker = messageRow({
  id: 'm-st-1', direction: 'outbound', body: null, media_id: null, media_path: 'out/a/r/s.webp',
  media_mime: 'image/webp', template_key: null, template_params: null,
  interactive_payload: { type: 'sticker', sticker: { sha256: 'abc=', id: 'wa-media-1' } },
});

const files = (queue = vi.fn()) => {
  const storage = { copy: vi.fn().mockResolvedValue(undefined) };
  const queries = { thread: vi.fn().mockResolvedValue(null), numberWindows: vi.fn() };
  const outbox = { queue };
  const repo = queries as unknown as ThreadsRepo;
  return new ForwardFiles(repo, outbox as unknown as Outbox, storage as unknown as StorageService);
};

describe('ForwardFiles — a sticker', () => {
  it('copies with the sticker type and sha256 only', async () => {
    const file = await files().copy(sticker, { actorId: ACTOR, requestId: 'r1' });
    expect(file.payload).toEqual({ type: 'sticker', sticker: { sha256: 'abc=' } });
    expect(file.mime).toBe('image/webp');
  });

  it('a photo copies with no payload', async () => {
    const photo = { ...sticker, media_mime: 'image/jpeg', interactive_payload: null };
    expect((await files().copy(photo, { actorId: ACTOR, requestId: 'r1' })).payload).toBeUndefined();
  });
});
