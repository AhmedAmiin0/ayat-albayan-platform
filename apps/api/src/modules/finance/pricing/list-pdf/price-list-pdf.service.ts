import type { PriceList } from '@ab/money';
import type { PriceListPdfResponse } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { BUCKETS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { PricingService } from '@/modules/finance/pricing/pricing.service';
import { pdfAssets, PdfRenderer } from '@/modules/reporting/report-pdf';
import { priceListPdfModel } from './price-list-pdf.model';
import { PriceListPdfSettings } from './price-list-pdf.settings';
import type { PriceListPdfInput } from './price-list-pdf.types';
import { priceListHtml } from './template';

const PDF = 'application/pdf';

/**
 * Where a chat file of this actor and request lives (out/{actor}/{request}/…), so the chat's own
 * file send queues it; one fixed name, so a retried request overwrites the same object.
 */
const pdfPath = (actorId: string, requestId: string): string =>
  `out/${actorId}/${requestId}/price-list.pdf`;

/** ASCII, so every WhatsApp client shows it as sent. */
const fileName = (list: PriceList): string =>
  `ayat-albayan-prices-${(list.country ?? list.currency).toLowerCase()}.pdf`;

/**
 * A country's whole price list as a branded PDF (docs/08 §3b): priced by PricingService.list, the
 * same list the quote sheet shows, rendered like the lesson report and stored in wa-media.
 */
@Injectable()
export class PriceListPdf {
  private rendering = 0;

  constructor(
    private readonly pricing: PricingService,
    private readonly renderer: PdfRenderer,
    private readonly storage: StorageService,
    private readonly settings: PriceListPdfSettings,
  ) {}

  async create(input: PriceListPdfInput): Promise<PriceListPdfResponse> {
    const { clientRequestId, ...choice } = input.body;
    const [list, contact] = await Promise.all([this.pricing.list(choice), this.settings.contact()]);
    const model = priceListPdfModel(list, { country: choice.country, contact });
    const bytes = await this.render(priceListHtml(model, pdfAssets()));
    const ref = { bucket: BUCKETS.waMedia, path: pdfPath(input.actorId, clientRequestId) };
    const path = await this.storage.upload({ ...ref, body: bytes, contentType: PDF });
    const filename = fileName(list);
    const { url } = await this.storage.signedDownload({ ...ref, path, download: filename });
    return { path, url, filename };
  }

  /**
   * A staff click now and then does not need the browser resident between lists; it closes only
   * once no other list is printing on it.
   */
  private async render(html: string): Promise<Uint8Array> {
    this.rendering += 1;
    try {
      return await this.renderer.render(html);
    } finally {
      this.rendering -= 1;
      if (this.rendering === 0) await this.renderer.close();
    }
  }
}
