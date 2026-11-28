import {
  formatAmount,
  priceList,
  type PriceList,
  type PriceListResponse,
  type Quote,
} from '@ab/money';
import type { PriceListQueryParams } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import type { PdfRenderer } from '@/modules/reporting/report-pdf';
import type { PricingService } from '@/modules/finance/pricing/pricing.service';
import { PriceListPdf } from '@/modules/finance/pricing/list-pdf/price-list-pdf.service';
import type { PriceListPdfSettings } from '@/modules/finance/pricing/list-pdf/price-list-pdf.settings';

const REQUEST = '7f0c2b9e-6f4a-4c1d-9a51-2f3c8e1d4b60';
const BYTES: Uint8Array = new TextEncoder().encode('%PDF-1.7 fake');
const CONTACT = { whatsapp: '+000 00 000 0000', site: 'example.test' };

function harness() {
  const list = vi.fn(async (q: PriceListQueryParams): Promise<PriceListResponse> => ({
    ...priceList(q),
    fx: null,
  }));
  const render = vi.fn(async (_html: string): Promise<Uint8Array> => BYTES);
  const close = vi.fn(async () => undefined);
  const upload = vi.fn(async (ref: { path: string }) => ref.path);
  const signedDownload = vi.fn(async () => ({ url: 'https://files.test/p', expires_at: 'x' }));
  const pdf = new PriceListPdf(
    { list } as unknown as PricingService,
    { render, close } as unknown as PdfRenderer,
    { upload, signedDownload } as unknown as StorageService,
    { contact: async () => CONTACT } as unknown as PriceListPdfSettings,
  );
  return { pdf, list, render, close, upload, signedDownload };
}

const body = (discount: number) => ({
  country: 'QA',
  students: 1,
  discount,
  rounding: 'down' as const,
  clientRequestId: REQUEST,
});

function secondOfSecond(list: PriceList): Quote {
  const q = list.groups[1]?.packages[2];
  if (!q) throw new Error('no package 1/2');
  return q;
}

describe('PriceListPdf.create', () => {
  it('prices through the list, renders it and stores it as this request chat file', async () => {
    const h = harness();
    const out = await h.pdf.create({ body: body(10), actorId: 'staff-1' });
    const { clientRequestId: _id, ...choice } = body(10);
    expect(h.list).toHaveBeenCalledWith(choice);
    expect(h.upload).toHaveBeenCalledWith({
      bucket: 'wa-media',
      path: `out/staff-1/${REQUEST}/price-list.pdf`,
      body: BYTES,
      contentType: 'application/pdf',
    });
    expect(out).toEqual({
      path: `out/staff-1/${REQUEST}/price-list.pdf`,
      url: 'https://files.test/p',
      filename: 'ayat-albayan-prices-qa.pdf',
    });
    expect(h.close).toHaveBeenCalled();
  });

  it('renders the discounted rows the list priced, struck old prices included', async () => {
    const h = harness();
    await h.pdf.create({ body: body(10), actorId: 'staff-1' });
    const html = h.render.mock.calls[0]?.[0] ?? '';
    const q = secondOfSecond(priceList(body(10)));
    expect(html).toContain(`<s>${formatAmount(q.total)}</s>`);
    expect(html).toContain(`<b class="now">${formatAmount(q.afterDiscount)}</b>`);
    expect(html).toContain(CONTACT.whatsapp);
  });

  it('without a discount renders no struck price', async () => {
    const h = harness();
    await h.pdf.create({ body: body(0), actorId: 'staff-1' });
    expect(h.render.mock.calls[0]?.[0]).not.toContain('<s>');
  });

  it('a list without a site country is named for USD', async () => {
    const h = harness();
    const { country: _c, ...rest } = body(0);
    h.list.mockResolvedValueOnce({ ...priceList({ ...rest, usdRate: 0.25 }), fx: null });
    const out = await h.pdf.create({ body: rest, actorId: 'staff-1' });
    expect(out.filename).toBe('ayat-albayan-prices-usd.pdf');
  });

  it('frees the browser even when the render fails', async () => {
    const h = harness();
    h.render.mockRejectedValueOnce(new Error('no browser'));
    await expect(h.pdf.create({ body: body(0), actorId: 'staff-1' })).rejects.toThrow('no browser');
    expect(h.close).toHaveBeenCalled();
    expect(h.upload).not.toHaveBeenCalled();
  });

  it('keeps the browser open while another list is still printing', async () => {
    const h = harness();
    let finish: (bytes: Uint8Array) => void = () => undefined;
    h.render.mockImplementationOnce(() => new Promise((done) => (finish = done)));
    const slow = h.pdf.create({ body: body(0), actorId: 'staff-1' });
    await h.pdf.create({ body: body(5), actorId: 'staff-1' });
    expect(h.close).not.toHaveBeenCalled();
    finish(BYTES);
    await slow;
    expect(h.close).toHaveBeenCalledTimes(1);
  });
});
