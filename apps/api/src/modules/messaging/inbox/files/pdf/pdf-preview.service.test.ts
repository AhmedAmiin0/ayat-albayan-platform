import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type MediaMessage, waHttpError } from '../../../whatsapp';
import { ask, jpgs, PDF_BYTES, setup, status } from './pdf-preview.fakes';
import { pdfPageCount, renderPdfPages } from './pdf-client';

// The sandbox's two calls (pdf-client.ts); the slot and PdfToolError stay pdf-render's own.
vi.mock('./pdf-client', () => ({ pdfPageCount: vi.fn(), renderPdfPages: vi.fn() }));
const count = vi.mocked(pdfPageCount);
const render = vi.mocked(renderPdfPages);
const EXPIRES = '2026-10-29T13:00:00.000Z';

beforeEach(() => {
  count.mockReset().mockResolvedValue(12);
  render.mockReset().mockImplementation(async (_bytes, range) => jpgs(range));
});

describe('PdfPreviewService.page (owner 2026-10-29: a PDF bubble like WhatsApp)', () => {
  it('first page-1 request: one read, pdfinfo, the answer stored, page 1 rendered and uploaded, then signed', async () => {
    const t = setup();
    t.objects.set('m1.pdf', PDF_BYTES);
    const res = await t.service.page(ask(1));
    expect(res).toEqual({ url: 'https://signed/pdf/m1/1.jpg', expires_at: EXPIRES, page: 1, pages: 12, bytes: PDF_BYTES.byteLength });
    expect(t.media.bubbleObject).toHaveBeenCalledWith(ask(1));
    expect(t.storage.download).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledWith(PDF_BYTES);
    expect(t.queries.setDoc).toHaveBeenCalledWith('m1', { pages: 12, bytes: PDF_BYTES.byteLength });
    expect(render).toHaveBeenCalledExactlyOnceWith(PDF_BYTES, { first: 1, last: 1 });
    expect(t.storage.upload).toHaveBeenCalledWith({ bucket: 'wa-media', path: 'pdf/m1/1.jpg', body: expect.any(Uint8Array), contentType: 'image/jpeg' });
  });

  it('already probed and rendered: no read, no poppler, only a signature', async () => {
    const t = setup();
    t.docs.set('m1', { pages: 12, bytes: 99 });
    t.objects.set('pdf/m1/1.jpg', new Uint8Array([1]));
    await expect(t.service.page(ask(1))).resolves.toMatchObject({ page: 1, pages: 12, bytes: 99 });
    expect([t.storage.download, count, render].map((f) => f.mock.calls.length)).toEqual([0, 0, 0]);
  });

  it('a page of the viewer renders its run (2–6) once, even for two requests at the same time', async () => {
    const t = setup();
    t.objects.set('m1.pdf', PDF_BYTES);
    t.docs.set('m1', { pages: 12, bytes: 99 });
    const [a, b] = await Promise.all([t.service.page(ask(3)), t.service.page(ask(4))]);
    expect([a.url, b.url]).toEqual(['https://signed/pdf/m1/3.jpg', 'https://signed/pdf/m1/4.jpg']);
    expect(render).toHaveBeenCalledExactlyOnceWith(PDF_BYTES, { first: 2, last: 6 });
    expect(t.storage.upload.mock.calls.map(([ref]) => ref.path)).toEqual([2, 3, 4, 5, 6].map((n) => `pdf/m1/${n}.jpg`));
    expect(count).not.toHaveBeenCalled();
  });

  it('no preview (encrypted, broken) is 422 pdf_no_preview; a page past min(pages, 30) is 400', async () => {
    const t = setup();
    t.docs.set('m1', { pages: 0, bytes: 99 });
    expect(await status(t.service.page(ask(1)))).toEqual({ status: 422, body: expect.objectContaining({ code: 'pdf_no_preview' }) });
    t.docs.set('m2', { pages: 12, bytes: 99 });
    t.docs.set('m3', { pages: 40, bytes: 99 });
    for (const [page, id] of [[13, 'm2'], [31, 'm3']] as const) {
      expect(await status(t.service.page(ask(page, id)))).toMatchObject({ status: 400, body: { code: 'page_out_of_range' } });
    }
    expect(render).not.toHaveBeenCalled();
  });

  it('not a PDF is 400 invoice_message; the file route\'s own errors (410 media_expired …) pass through unchanged', async () => {
    const t = setup();
    t.media.bubbleObject.mockResolvedValueOnce({ msg: { id: 'm1' } as MediaMessage, file: { bucket: 'wa-media', path: 'm1.jpg', mime: 'image/jpeg' } });
    expect(await status(t.service.page(ask(1)))).toMatchObject({ status: 400, body: { code: 'invoice_message' } });
    t.media.bubbleObject.mockRejectedValueOnce(waHttpError('media_expired', HttpStatus.GONE));
    expect(await status(t.service.page(ask(1)))).toMatchObject({ status: 410, body: { code: 'media_expired' } });
    expect(t.queries.doc).not.toHaveBeenCalled();
  });
});
