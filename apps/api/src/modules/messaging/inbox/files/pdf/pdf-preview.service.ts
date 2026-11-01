import { INVOICE_MAX_BYTES, isPdfMime, PDF_PREVIEW_PAGES, type ThreadPdfPage } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { BUCKETS, pdfPagePath } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { type InboundFile, waHttpError } from '@/modules/messaging/whatsapp';
import { ThreadMediaService } from '@/modules/messaging/inbox/files/thread-media.service';
import { FailedRecently, InFlight, pageRange, type PageRange } from './pdf-pages';
import { PdfPreviewRepo, type PdfDoc } from './pdf-preview.repo';
// poppler runs in ayat-pdf (pdf-client.ts over its socket), never here; pdf-render gives the slot and the error.
import { pdfPageCount, renderPdfPages } from './pdf-client';
import { inSlot, PdfToolError, type PdfPageImage } from './pdf-render';

/** A page run that failed is refused for this long (per process) instead of taking the slot again. */
const FAILED_MS = 10 * 60_000;
/** The 503's code per PdfToolError reason. */
const ERROR_CODE: Record<PdfToolError['reason'], string> = { busy: 'pdf_busy', failed: 'pdf_render_failed', unavailable: 'pdf_unavailable' };

/**
 * A chat PDF like WhatsApp's (owner 2026-10-29): GET /threads/:phone/messages/:id/pdf/:page signs
 * one page as a JPEG, with the PDF's page count and size; page 1 is the bubble's thumb. The file is
 * resolved as /file resolves it (ThreadMediaService.bubbleObject, its 404 / 410 / 409 / 413 / 502 /
 * 503 unchanged), so every PDF a bubble opens previews: a family's, an echo, one staff sent or
 * forwarded, an imported CRM file. Nothing renders ahead: pdfinfo and page 1 on the first request
 * (the apps ask it once the bubble is on screen), pages 2+ in runs (pageRange) when the viewer
 * asks; the images stay in wa-media/pdf/{message_id}/{page}.jpg and render again if ever missing.
 * Concurrent asks share one probe or render (InFlight, per process); every PDF byte is parsed in
 * ayat-pdf, never in this process. 400 invoice_message (not a PDF) / page_out_of_range, 422
 * pdf_no_preview (encrypted, broken), 503 pdf_busy / pdf_render_failed / pdf_unavailable (no
 * sandbox: local dev, CI; a retry may work; nothing stored). ponytail: the Meta / CRM download
 * inside bubbleObject (the first view of an uncached PDF) runs before the render slot, unbounded as
 * the photo bubbles' is; the slot then reads that stored copy once more. Pass the fresh bytes to
 * the probe if that ever shows in memory.
 */
@Injectable()
export class PdfPreviewService {
  // ponytail: per process; the two API copies may each render a run once (same paths, uploads upsert).
  private readonly probes = new InFlight<PdfDoc>();
  private readonly renders = new InFlight<void>();
  private readonly failed = new FailedRecently(FAILED_MS);

  constructor(
    private readonly media: ThreadMediaService,
    private readonly storage: StorageService,
    private readonly queries: PdfPreviewRepo,
  ) {}

  async page(input: { phone: string; messageId: string; page: number }): Promise<ThreadPdfPage> {
    const { msg, file } = await this.media.bubbleObject(input);
    if (!isPdfMime(file.mime)) throw waHttpError('invoice_message', HttpStatus.BAD_REQUEST);
    const known = await this.queries.doc(msg.id);
    const doc = known ?? (await this.guard(`${msg.id}:1`, () => this.probes.run(msg.id, () => this.probe(msg.id, file))));
    if (doc.pages === 0) throw waHttpError('pdf_no_preview', HttpStatus.UNPROCESSABLE_ENTITY);
    if (input.page > Math.min(doc.pages, PDF_PREVIEW_PAGES)) throw waHttpError('page_out_of_range', HttpStatus.BAD_REQUEST);
    const ref = { bucket: BUCKETS.waMedia, path: pdfPagePath({ messageId: msg.id, page: input.page }) };
    if (!(await this.storage.exists(ref))) {
      const range = pageRange(input.page, doc.pages);
      const key = `${msg.id}:${range.first}`;
      await this.guard(key, () => this.renders.run(key, () => this.render({ id: msg.id, file, range })));
    }
    return { ...(await this.storage.signedDownload(ref)), page: input.page, ...doc };
  }

  /**
   * In the slot: the stored PDF, pdfinfo, page 1 from the same bytes, then pdfinfo's answer stored
   * (it never changes). Stored last: a page-1 request meanwhile finds no answer and joins this
   * probe (InFlight) instead of rendering page 1 a second time. Over INVOICE_MAX_BYTES is «no
   * preview» without poppler: a second check, since the cache and the send already refuse a PDF
   * over 10 MB.
   */
  private probe(id: string, file: InboundFile): Promise<PdfDoc> {
    return inSlot(async () => {
      const bytes = await this.read(file);
      const doc = { pages: bytes.byteLength > INVOICE_MAX_BYTES ? 0 : await pdfPageCount(bytes), bytes: bytes.byteLength };
      if (doc.pages > 0) await this.upload(id, await renderPdfPages(bytes, { first: 1, last: 1 }));
      await this.queries.setDoc(id, doc);
      return doc;
    });
  }

  private render(input: { id: string; file: InboundFile; range: PageRange }): Promise<void> {
    return inSlot(async () => this.upload(input.id, await renderPdfPages(await this.read(input.file), input.range)));
  }

  /** Storage answers null on any error; the object was just resolved, so it is a blip (503), never 410. */
  private async read(file: InboundFile): Promise<Uint8Array> {
    const bytes = await this.storage.download({ bucket: file.bucket, path: file.path });
    if (!bytes) throw waHttpError('pdf_render_failed', HttpStatus.SERVICE_UNAVAILABLE);
    return bytes;
  }

  private async upload(id: string, pages: PdfPageImage[]): Promise<void> {
    await Promise.all(
      pages.map((p) =>
        this.storage.upload({ bucket: BUCKETS.waMedia, path: pdfPagePath({ messageId: id, page: p.page }), body: p.jpg, contentType: 'image/jpeg' }),
      ),
    );
  }

  /**
   * 'busy' → 503 pdf_busy; 'unavailable' → 503 pdf_unavailable (the sandbox, not the PDF: never remembered);
   * 'failed' → 503 pdf_render_failed, and the key is refused for FAILED_MS.
   */
  private async guard<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.failed.has(key)) throw waHttpError('pdf_render_failed', HttpStatus.SERVICE_UNAVAILABLE);
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof PdfToolError)) throw e;
      if (e.reason === 'failed') this.failed.add(key);
      throw waHttpError(ERROR_CODE[e.reason], HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
