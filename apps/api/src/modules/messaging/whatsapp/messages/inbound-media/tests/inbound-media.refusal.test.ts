import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { WaError, type WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { InboundMediaRepo, MediaMessage } from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.repo';
import { InboundMedia } from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.service';

// R-MSG-06 / R-NFR-07: a final refusal is kept on the row; later views answer it with no call.

const row = (over: Partial<MediaMessage> = {}): MediaMessage => ({
  id: 'm1',
  phone_e164: '+966552147730',
  direction: 'inbound',
  media_id: 'EVO-IN-1',
  media_mime: 'application/pdf',
  media_path: null,
  body: null,
  created_at: new Date().toISOString(),
  line: null,
  ...over,
});

function setup(msg: MediaMessage, failure: Error) {
  const queries = {
    message: vi.fn().mockResolvedValue(msg),
    setPath: vi.fn().mockResolvedValue(undefined),
    setRefusal: vi.fn().mockResolvedValue(undefined),
  };
  const client = { getMedia: vi.fn().mockRejectedValue(failure), configured: () => true };
  const lines = { notifications: client, chat: client };
  const media = new InboundMedia(
    queries as unknown as InboundMediaRepo,
    lines as unknown as WhatsappLines,
    { upload: vi.fn() } as unknown as StorageService,
  );
  return { media, queries, client };
}

const answer = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: e.getStatus(), body: e.getResponse() };
};

const TOO_LARGE = { status: 413, body: { code: 'invoice_too_large' } };

describe('InboundMedia: a refused file is remembered', () => {
  it('too large from the driver: 413, kept on the row', async () => {
    const { media, queries } = setup(row(), waHttpError('invoice_too_large', 413));
    expect(await answer(media.ensure('m1'))).toMatchObject(TOO_LARGE);
    expect(queries.setRefusal).toHaveBeenCalledWith('m1', 'invoice_too_large');
  });

  it('the provider refusing the id: 410, kept on the row', async () => {
    const { media, queries } = setup(row(), new WaError('gone', { code: 100, status: 404 }));
    expect(await answer(media.ensure('m1'))).toMatchObject({ status: 410 });
    expect(queries.setRefusal).toHaveBeenCalledWith('m1', 'media_expired');
  });

  it('a second view of a refused file makes no provider call', async () => {
    const msg = row({ media_refusal: 'invoice_too_large' });
    const { media, client, queries } = setup(msg, new Error('never called'));
    expect(await answer(media.ensure('m1'))).toMatchObject(TOO_LARGE);
    expect(await answer(media.cache(msg))).toMatchObject(TOO_LARGE);
    expect(client.getMedia).not.toHaveBeenCalled();
    expect(queries.setRefusal).not.toHaveBeenCalled();
  });

  it('a stored expired refusal answers 410 with no call', async () => {
    const { media, client } = setup(row({ media_refusal: 'media_expired' }), new Error('x'));
    expect(await answer(media.ensure('m1'))).toMatchObject({ status: 410 });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('a cached file is served even with a refusal on the row', async () => {
    const msg = row({ media_path: 'm1.pdf', media_refusal: 'invoice_too_large' });
    const { media, client } = setup(msg, new Error('x'));
    await expect(media.ensure('m1')).resolves.toMatchObject({ path: 'm1.pdf' });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it.each([
    ['a timeout', new WaError('timed out', { code: null, status: 0 })],
    ['a 5xx', new WaError('down', { code: null, status: 503 })],
    ['a rate limit (429)', new WaError('slow down', { code: 4, status: 429 })],
    ['a refused key', waHttpError('evolution_auth', 502)],
  ])('%s is not kept: a retry may work', async (_name, failure) => {
    const { media, queries } = setup(row(), failure);
    await expect(media.ensure('m1')).rejects.toBeDefined();
    expect(queries.setRefusal).not.toHaveBeenCalled();
  });

  it('bytes past the mime cap: 413, kept on the row', async () => {
    const { media, client, queries } = setup(row({ media_mime: 'image/jpeg' }), new Error('x'));
    client.getMedia.mockResolvedValue({ bytes: new Uint8Array(11 * 1024 * 1024) });
    expect(await answer(media.ensure('m1'))).toMatchObject(TOO_LARGE);
    expect(queries.setRefusal).toHaveBeenCalledWith('m1', 'invoice_too_large');
  });

  it('an unknown value in the column is ignored (the file is fetched)', async () => {
    const msg = row({ media_refusal: 'something_else' });
    const { media, client } = setup(msg, new WaError('down', { code: null, status: 503 }));
    await expect(media.ensure('m1')).rejects.toBeInstanceOf(WaError);
    expect(client.getMedia).toHaveBeenCalledTimes(1);
  });
});
