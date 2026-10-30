import { INVOICE_MAX_BYTES } from '@ab/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ask, jpgs, PDF_BYTES, setup, status } from './pdf-preview.fakes';
import { pdfPageCount, renderPdfPages } from './pdf-client';
import { PdfToolError } from './pdf-render';

// The limits a hostile or huge PDF meets in PdfPreviewService (the timeouts and the memory cap: pdf-render.spawn.test.ts;
// the socket's own: pdf-client.test.ts).
vi.mock('./pdf-client', () => ({ pdfPageCount: vi.fn(), renderPdfPages: vi.fn() }));
const count = vi.mocked(pdfPageCount);
const render = vi.mocked(renderPdfPages);

beforeEach(() => {
  count.mockReset().mockResolvedValue(12);
  render.mockReset().mockImplementation(async (_bytes, range) => jpgs(range));
});

describe('PdfPreviewService limits', () => {
  it('size cap: a PDF over 10 MB never reaches poppler; «no preview» is stored for good (422)', async () => {
    const t = setup();
    t.objects.set('m1.pdf', new Uint8Array(INVOICE_MAX_BYTES + 1));
    expect(await status(t.service.page(ask(1)))).toMatchObject({ status: 422, body: { code: 'pdf_no_preview' } });
    expect(t.queries.setDoc).toHaveBeenCalledWith('m1', { pages: 0, bytes: INVOICE_MAX_BYTES + 1 });
    expect([count, render].map((f) => f.mock.calls.length)).toEqual([0, 0]);
  });

  it('a Storage read that fails is 503 pdf_render_failed (never a final 410), not remembered: the next view works', async () => {
    const t = setup();
    expect(await status(t.service.page(ask(1)))).toMatchObject({ status: 503, body: { code: 'pdf_render_failed' } });
    expect(t.queries.setDoc).not.toHaveBeenCalled();
    t.objects.set('m1.pdf', PDF_BYTES);
    await expect(t.service.page(ask(1))).resolves.toMatchObject({ page: 1, pages: 12 });
  });

  it('poppler failed (crash, hang, memory cap): 503 pdf_render_failed, nothing stored, and refused for 10 min without poppler', async () => {
    const t = setup();
    t.objects.set('m1.pdf', PDF_BYTES);
    count.mockRejectedValueOnce(new PdfToolError('failed'));
    expect(await status(t.service.page(ask(1)))).toMatchObject({ status: 503, body: { code: 'pdf_render_failed' } });
    expect(await status(t.service.page(ask(1)))).toMatchObject({ status: 503, body: { code: 'pdf_render_failed' } });
    expect([count.mock.calls.length, t.queries.setDoc.mock.calls.length]).toEqual([1, 0]);
    // A failing page run is refused on its own: page 1 of another PDF still renders.
    t.objects.set('m2.pdf', PDF_BYTES);
    await expect(t.service.page(ask(1, 'm2'))).resolves.toMatchObject({ page: 1 });
  });

  it('no sandbox (local dev, CI, ayat-pdf restarting): 503 pdf_unavailable, nothing stored or remembered: the next view asks again', async () => {
    const t = setup();
    t.objects.set('m1.pdf', PDF_BYTES);
    count.mockRejectedValueOnce(new PdfToolError('unavailable'));
    expect(await status(t.service.page(ask(1)))).toMatchObject({ status: 503, body: { code: 'pdf_unavailable' } });
    expect(t.queries.setDoc).not.toHaveBeenCalled();
    await expect(t.service.page(ask(1))).resolves.toMatchObject({ page: 1, pages: 12 });
    expect(count).toHaveBeenCalledTimes(2);
  });

  it('one render per process and 8 waiting: the next is 503 pdf_busy, nothing stored, and it works once the queue drains', async () => {
    const t = setup();
    for (let i = 0; i < 10; i++) t.objects.set(`m${i}.pdf`, PDF_BYTES);
    let release: (n: number) => void = () => undefined;
    count.mockImplementationOnce(() => new Promise<number>((r) => {
      release = r;
    }));
    const calls = Array.from({ length: 10 }, (_, i) => t.service.page(ask(1, `m${i}`)));
    expect(await status(calls[9] ?? Promise.resolve())).toMatchObject({ status: 503, body: { code: 'pdf_busy' } });
    expect(t.queries.setDoc).not.toHaveBeenCalledWith('m9', expect.anything());
    release(12);
    await expect(Promise.all(calls.slice(0, 9))).resolves.toHaveLength(9);
    await expect(t.service.page(ask(1, 'm9'))).resolves.toMatchObject({ page: 1, pages: 12 });
  });
});
