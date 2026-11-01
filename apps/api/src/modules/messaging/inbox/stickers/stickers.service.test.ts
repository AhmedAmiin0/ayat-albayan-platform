import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { StickerRepo, StickerRow } from './sticker.repo';
import { StickersService } from './stickers.service';

// «أضف إلى المفضلة» / «أزل من المفضلة» on a sticker bubble (owner 2026-11-01).
const ME = 'a0000000-0000-4000-8000-000000000001';
const sticker: StickerRow = {
  id: 'b1111111-1111-4111-8111-111111111111',
  phone_e164: '+966500000001',
  direction: 'inbound',
  media_id: 'wa-1',
  media_path: null,
  created_at: new Date().toISOString(),
  interactive_payload: { type: 'sticker', sticker: { sha256: 'abc=' } },
};

function service(held: StickerRow[] = [sticker]) {
  const repo = {
    recent: vi.fn(async () => [sticker]),
    messages: vi.fn(async () => held),
    favourites: vi.fn(async () => [{ profile_id: ME, sticker_key: 'sha:abc=', message_id: sticker.id }]),
    save: vi.fn(async () => undefined),
    drop: vi.fn(async () => undefined),
  };
  const none = {} as never;
  return { repo, stickers: new StickersService(repo as unknown as StickerRepo, none, none) };
}

describe('StickersService', () => {
  it('saves the sticker by its key, held by this message', async () => {
    const { repo, stickers } = service();
    await stickers.favourite({ profileId: ME, messageId: sticker.id });
    expect(repo.save).toHaveBeenCalledWith({ profile_id: ME, sticker_key: 'sha:abc=', message_id: sticker.id });
  });

  it('drops the same sticker by its key', async () => {
    const { repo, stickers } = service();
    await stickers.unfavourite({ profileId: ME, messageId: sticker.id });
    expect(repo.drop).toHaveBeenCalledWith({ profile_id: ME, sticker_key: 'sha:abc=' });
  });

  it('a message that is no (visible) sticker is 404, nothing saved', async () => {
    const { repo, stickers } = service([]);
    const saving = stickers.favourite({ profileId: ME, messageId: sticker.id });
    await expect(saving).rejects.toBeInstanceOf(HttpException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lists the favourites first, then the newest of any chat', async () => {
    const { stickers } = service();
    const item = { message_id: sticker.id, phone: '+966500000001', key: 'sha:abc=' };
    await expect(stickers.list(ME)).resolves.toEqual({ favourites: [item], recent: [item] });
  });
});
