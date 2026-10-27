import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import { crmLink } from '../../whatsapp/messages/crm-history/crm-history.fakes';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import type { Outbox } from '../send/outbox';
import type { ThreadsQueries } from '../threads/threads.queries';
import { ForwardFiles } from './forward-files';

// Owner 2026-10-27: a photo imported from the old CRM forwards like any family file (through
// InboundMedia's cache), and its body, only the CRM storage link, never travels as a caption.
const row = messageRow({
  id: 'm-crm-1', direction: 'inbound', body: crmLink(), media_id: null, media_path: null,
  media_mime: 'image/webp', template_key: null, template_params: null,
});

describe('ForwardFiles.copy — an old-CRM file', () => {
  it('is cached through InboundMedia, copied to out/…, with no caption', async () => {
    const storage = { copy: vi.fn().mockResolvedValue(undefined) };
    const inbound = {
      loadChat: vi.fn().mockResolvedValue(row),
      cache: vi.fn().mockResolvedValue({ bucket: 'wa-media', path: 'm-crm-1.webp', mime: 'image/webp' }),
    };
    const files = new ForwardFiles({} as ThreadsQueries, {} as Outbox, storage as unknown as StorageService);
    Object.assign(files, { inbound });
    const file = await files.copy(row, { actorId: 'a0000000-0000-4000-8000-000000000001', requestId: 'r1' });
    expect(inbound.loadChat).toHaveBeenCalledWith('m-crm-1');
    expect(storage.copy).toHaveBeenCalledWith(expect.objectContaining({ from: { bucket: 'wa-media', path: 'm-crm-1.webp' } }));
    expect([file.caption, file.mime]).toEqual([null, 'image/webp']);
  });
});
