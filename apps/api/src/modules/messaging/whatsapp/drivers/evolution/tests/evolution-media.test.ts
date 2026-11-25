import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { evolutionMedia, MEDIA_ANSWER_MAX } from '@/modules/messaging/whatsapp/drivers/evolution/evolution-media';
import { EVO_BAILEYS } from '@/modules/messaging/whatsapp/drivers/evolution/evolution.fakes';

const MB = 1024 * 1024;

/** An answer streamed in 1 MB chunks, counting what was pulled from it. */
function chunked(total: number) {
  const seen = { pulled: 0 };
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const size = Math.min(MB, total - seen.pulled);
      seen.pulled += size;
      controller.enqueue(new Uint8Array(size).fill(0x41));
      if (seen.pulled >= total) controller.close();
    },
  });
  return { seen, fetch: () => Promise.resolve(new Response(stream, { status: 201 })) };
}

const answering = (body: string) => () => Promise.resolve(new Response(body, { status: 201 }));

const conn = (fetch: () => Promise<Response>) => ({ env: EVO_BAILEYS, fetch, timeoutMs: 5_000 });

describe('evolutionMedia: bounded read (R-NFR-07)', () => {
  it('the cap is the base64 of the 16 MB chat cap plus JSON slack (about 22.5 MB)', () => {
    expect(MEDIA_ANSWER_MAX).toBeGreaterThan(Math.ceil((16 * MB) / 3) * 4);
    expect(MEDIA_ANSWER_MAX).toBeLessThan(23 * MB);
  });

  it('a 30 MB answer is refused (413) without reading past the cap', async () => {
    const big = chunked(30 * MB);
    const e: unknown = await evolutionMedia(conn(big.fetch), 'EVO-IN-1').catch((x: unknown) => x);
    expect(e).toBeInstanceOf(HttpException);
    expect((e as HttpException).getResponse()).toMatchObject({ code: 'invoice_too_large' });
    expect(big.seen.pulled).toBeLessThanOrEqual(MEDIA_ANSWER_MAX + 2 * MB);
  });

  it('a declared content-length past the cap is refused before the body is read', async () => {
    const big = chunked(30 * MB);
    const headers = { 'content-length': String(30 * MB) };
    const fetch = () => big.fetch().then((r) => new Response(r.body, { status: 201, headers }));
    await expect(evolutionMedia(conn(fetch), 'EVO-IN-1')).rejects.toBeInstanceOf(HttpException);
    expect(big.seen.pulled).toBeLessThanOrEqual(2 * MB);
  });

  it('a 1 MB file still opens, decoded once', async () => {
    const file = Buffer.alloc(MB, 7);
    const body = JSON.stringify({ base64: file.toString('base64'), mimetype: 'video/mp4' });
    const media = await evolutionMedia(conn(answering(body)), 'EVO-IN-1');
    expect(media.bytes.byteLength).toBe(MB);
    expect(Buffer.from(media.bytes).equals(file)).toBe(true);
    expect(media.mime).toBe('video/mp4');
  });

  it('no mimetype: application/octet-stream', async () => {
    const body = JSON.stringify({ base64: Buffer.from('%PDF').toString('base64') });
    const media = await evolutionMedia(conn(answering(body)), 'EVO-IN-1');
    expect(media.mime).toBe('application/octet-stream');
  });

  it.each([['not json'], [JSON.stringify({ base64: '' })], [JSON.stringify({ other: 1 })]])(
    'an answer that is not the media shape is a WaError (%s)',
    async (body) => {
      const p = evolutionMedia(conn(answering(body)), 'EVO-IN-1');
      await expect(p).rejects.toBeInstanceOf(WaError);
      await expect(p).rejects.toMatchObject({ info: { status: 200, code: null } });
    },
  );
});
