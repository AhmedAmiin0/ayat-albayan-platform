import { AR, esc, type PdfAssets } from '@/modules/reporting/report-pdf';
import type { PriceListPdfModel } from '@/modules/finance/pricing/list-pdf/price-list-pdf.types';
import { aboutHtml } from './template.about';
import { cardsHtml } from './template.cards';
import { PRICE_LIST_CSS } from './template.css';
import { footerHtml } from './template.footer';
import { headerHtml } from './template.header';
import { tableHtml } from './template.table';

/**
 * A country's whole price list on one A4 page, as the owner's reference design lays it out:
 * header, the tier table, the two package cards, programmes, promises and the contact band.
 * Pure: the same model gives the same HTML.
 */
export function priceListHtml(m: PriceListPdfModel, assets: PdfAssets): string {
  return [
    '<!doctype html><html lang="ar" dir="rtl" data-theme="light"><head><meta charset="utf-8">',
    `<title>${esc(AR.pricing.pdf.title)}</title>`,
    `<style>${assets.fontCss}\n${PRICE_LIST_CSS}</style></head>`,
    '<body><main class="sheet"><i class="bar"></i>',
    headerHtml(m, assets.logo),
    tableHtml(m),
    cardsHtml(m),
    aboutHtml(),
    footerHtml(m.contact),
    '<i class="bar"></i></main></body></html>',
  ].join('\n');
}
