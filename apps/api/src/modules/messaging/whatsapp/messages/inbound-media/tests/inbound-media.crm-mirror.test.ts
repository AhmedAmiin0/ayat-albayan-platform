import { afterEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { StorageService } from '@/common/storage/storage.service';
import type { WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';
import { CrmHistoryMedia } from '@/modules/messaging/whatsapp/messages/crm-history/crm-history-media';
import { CRM_HOST, crmResponse, crmRow, stubFetch } from '@/modules/messaging/whatsapp/messages/crm-history/crm-history.fakes';
import { CrmMediaSettings } from '@/modules/messaging/whatsapp/messages/crm-history/crm-media.settings';
import type { InboundMediaRepo, MediaMessage } from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.repo';
import { InboundMedia } from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.service';

// A file a family sent to the notifications number, mirrored from the CRM
// (webhook/crm-inbound), is stored like an imported CRM file. Legacy mode stamps no number on it:
// it is still fetched from the crm_media_host (and only from there). No real host is reached.

function setup(msg: MediaMessage) {
  const queries = {
    message: vi.fn(async () => msg),
    setRefusal: vi.fn(),
    setPath: vi.fn(async () => undefined),
  };
  const storage = { upload: vi.fn(async (r: { path: string }) => r.path) };
  const client = { configured: vi.fn(() => true), getMedia: vi.fn() };
  const lines = { notifications: client, chat: client } as unknown as WhatsappLines;
  const repo = queries as unknown as InboundMediaRepo;
  const media = new InboundMedia(repo, lines, storage as unknown as StorageService);
  const crm = new CrmHistoryMedia(readerOf(CrmMediaSettings, { crm_media_host: CRM_HOST }));
  Object.assign(media, { crm });
  return { media, client };
}

describe('InboundMedia: a mirrored CRM file with no number (legacy)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetched from the CRM storage and cached, never from a WhatsApp client', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    const { media, client } = setup(crmRow({ number: null, line: 'notifications' }));
    await expect(media.cache(await media.loadChat('m-crm-1'))).resolves.toMatchObject({
      path: 'm-crm-1.webp',
    });
    expect([fetch.mock.calls.length, client.getMedia.mock.calls.length]).toEqual([1, 0]);
  });

  it('a number on another driver still never fetches it (410)', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    const number = { id: 'n-k', provider: 'kapso', purpose: 'notifications' } as const;
    const { media } = setup(crmRow({ number }));
    await expect(media.cache(await media.loadChat('m-crm-1'))).rejects.toMatchObject({ status: 410 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
