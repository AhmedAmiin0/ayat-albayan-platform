import { AR, esc } from '@/modules/reporting/report-pdf';
import type { PdfPrice } from '@/modules/finance/pricing/list-pdf/price-list-pdf.types';

/** «instead of» and the struck total, only when the list has a discount. */
export function wasHtml(p: PdfPrice): string {
  if (p.was === null) return '';
  return `<span class="was">${esc(AR.pricing.pdf.insteadOf)} <s>${esc(p.was)}</s></span>`;
}

/** The price big and bold, its currency symbol small beside it. */
export const nowHtml = (p: PdfPrice, symbol: string): string =>
  `<span class="amt"><b class="now">${esc(p.now)}</b><small>${esc(symbol)}</small></span>`;

export const priceHtml = (p: PdfPrice | null, symbol: string): string =>
  p === null ? '—' : `${nowHtml(p, symbol)}${wasHtml(p)}`;
