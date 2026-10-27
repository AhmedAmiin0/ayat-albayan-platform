import { HttpException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../../../common/settings/settings.fakes';
import { CrmHistoryMedia } from './crm-history-media';
import { CrmMediaSettings } from './crm-media.settings';
import { CRM_HOST, crmLink, crmResponse, crmRow, stubFetch } from './crm-history.fakes';

const service = (host: string) => new CrmHistoryMedia(readerOf(CrmMediaSettings, { crm_media_host: host }));
const status = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return e.getStatus();
};

describe('CrmHistoryMedia', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('crm_media_host is seeded empty', async () => {
    expect(await readerOf(CrmMediaSettings).read()).toEqual({ crm_media_host: '' });
  });

  it('an empty setting → 410 media_expired as before, nothing fetched', async () => {
    const fetch = stubFetch(async () => crmResponse(3));
    expect(await status(service('').download(crmRow()))).toBe(410);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a link on another host → 410, nothing fetched', async () => {
    const fetch = stubFetch(async () => crmResponse(3));
    expect(await status(service(CRM_HOST).download(crmRow({ body: crmLink('a.webp', 'evil.example') })))).toBe(410);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches the allowed link once; two opens at the same time share it', async () => {
    const fetch = stubFetch(async () => crmResponse(3));
    const crm = service(CRM_HOST);
    const [a, b] = await Promise.all([crm.download(crmRow()), crm.download(crmRow())]);
    expect([a.bytes.byteLength, b.bytes.byteLength]).toEqual([3, 3]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(crmLink());
  });

  it('a voice note is capped at 16 MB (its mime decides the cap)', async () => {
    stubFetch(async () => crmResponse(16 * 1024 * 1024 + 1, { 'content-type': 'audio/ogg' }));
    expect(await status(service(CRM_HOST).download(crmRow({ media_mime: 'audio/ogg; codecs=opus' })))).toBe(413);
  });
});
