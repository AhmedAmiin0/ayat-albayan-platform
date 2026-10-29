import { isChatViewMime } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import type { StorageService } from '../../../../common/storage/storage.service';
import { CrmHistoryMedia } from './crm-history/crm-history-media';
import { CRM_HOST, crmLink, crmResponse, crmRow, stubFetch } from './crm-history/crm-history.fakes';
import { CrmMediaSettings } from './crm-history/crm-media.settings';
import type { InboundMediaQueries, MediaMessage } from './inbound-media.queries';
import { InboundMedia } from './inbound-media.service';
import type { WhatsappLines } from '../whatsapp.types';

// Owner 2026-10-27: photos and voice notes imported from the old CRM (no media id, the body is only
// the CRM storage link) are fetched once from the configured host and cached in wa-media.

function setup(msg: MediaMessage, host = CRM_HOST) {
  let stored = msg;
  const queries = {
    message: vi.fn(async () => stored),
    setPath: vi.fn(async (_id: string, path: string) => void (stored = { ...stored, media_path: path })),
  };
  const client = { configured: vi.fn(() => true), getMedia: vi.fn() };
  const storage = { upload: vi.fn().mockResolvedValue(undefined) };
  const lines = { notifications: client, chat: client } as unknown as WhatsappLines;
  const media = new InboundMedia(queries as unknown as InboundMediaQueries, lines, storage as unknown as StorageService);
  Object.assign(media, { crm: new CrmHistoryMedia(readerOf(CrmMediaSettings, { crm_media_host: host })) });
  return { media, queries, storage, client };
}

describe('InboundMedia: files imported from the old CRM', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetched once from the allowed host and cached; the second open reads the cache', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    const { media, queries, storage, client } = setup(crmRow());
    const first = await media.cache(await media.loadChat('m-crm-1'));
    expect(first).toEqual({ bucket: 'wa-media', path: 'm-crm-1.webp', mime: 'image/webp' });
    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ bucket: 'wa-media', path: 'm-crm-1.webp', contentType: 'image/webp' }));
    expect(queries.setPath).toHaveBeenCalledWith('m-crm-1', 'm-crm-1.webp');
    expect(await media.cache(await media.loadChat('m-crm-1'))).toEqual(first);
    expect([fetch.mock.calls.length, storage.upload.mock.calls.length, client.getMedia.mock.calls.length]).toEqual([1, 1, 0]);
  });

  it('older than 29 days is still fetched (the CRM keeps it; Meta\'s limit does not apply)', async () => {
    stubFetch(async () => crmResponse(4, { 'content-type': 'audio/ogg' }));
    const { media } = setup(crmRow({ media_mime: 'audio/ogg; codecs=opus', body: crmLink('v.ogg'), created_at: '2026-01-01T00:00:00Z' }));
    await expect(media.cache(await media.loadChat('m-crm-1'))).resolves.toMatchObject({ path: 'm-crm-1.ogg', mime: 'audio/ogg' });
  });

  it('the booking / receipt gate (load) takes a CRM photo too; isChatViewMime still decides a bubble', async () => {
    stubFetch(async () => crmResponse(4));
    const { media } = setup(crmRow());
    await expect(media.ensure('m-crm-1')).resolves.toMatchObject({ path: 'm-crm-1.webp' });
    await expect(media.load('m-crm-1', isChatViewMime)).resolves.toMatchObject({ id: 'm-crm-1' });
  });

  it('an empty setting → 410 media_expired as today, nothing fetched or stored', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    const { media, storage } = setup(crmRow(), '');
    await expect(media.cache(await media.loadChat('m-crm-1'))).rejects.toMatchObject({ status: 410 });
    expect([fetch.mock.calls.length, storage.upload.mock.calls.length]).toEqual([0, 0]);
  });

  it('a body with extra text is not a link: 410 media_expired (gone, not «try again»), never fetched', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    const { media } = setup(crmRow({ body: `صورة ${crmLink()}` }));
    await expect(media.loadChat('m-crm-1')).rejects.toMatchObject({ status: 410 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a receipt imported with only its name as body (owner 2026-10-29): 410 on every gate, nothing fetched', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    const { media, client } = setup(crmRow({ body: 'Transaction-Receipt.pdf', media_mime: 'application/pdf' }));
    await expect(media.load('m-crm-1')).rejects.toMatchObject({ status: 410 });
    await expect(media.loadChat('m-crm-1')).rejects.toMatchObject({ status: 410 });
    expect([fetch.mock.calls.length, client.getMedia.mock.calls.length]).toEqual([0, 0]);
  });

  it('a text row on the crm number (no mime) is still 400 invoice_message', async () => {
    const { media } = setup(crmRow({ body: 'السلام عليكم', media_mime: null }));
    await expect(media.loadChat('m-crm-1')).rejects.toMatchObject({ status: 400 });
  });

  it('a crm-number row WITH a media id is unchanged: 409 crm_no_media, nothing fetched', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    const { media, client } = setup(crmRow({ media_id: 'mid-1', created_at: new Date().toISOString() }));
    await expect(media.cache(await media.loadChat('m-crm-1'))).rejects.toMatchObject({ status: 409 });
    expect([fetch.mock.calls.length, client.getMedia.mock.calls.length]).toEqual([0, 0]);
  });

  it('a link row not on the old CRM number is never fetched (410)', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    const { media } = setup(crmRow({ number: { id: 'n-chat', provider: 'kapso', purpose: 'chat' } }));
    await expect(media.cache(await media.loadChat('m-crm-1'))).rejects.toMatchObject({ status: 410 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('without the CRM provider (a bare InboundMedia) such a row is 410', async () => {
    const queries = { message: vi.fn().mockResolvedValue(crmRow()), setPath: vi.fn() };
    const media = new InboundMedia(queries as unknown as InboundMediaQueries, {} as WhatsappLines, {} as StorageService);
    await expect(media.cache(await media.loadChat('m-crm-1'))).rejects.toMatchObject({ status: 410 });
  });
});
