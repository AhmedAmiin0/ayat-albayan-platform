import { AR, esc } from '@/modules/reporting/report-pdf';
import type {
  PdfPackageCard,
  PriceListPdfModel,
} from '@/modules/finance/pricing/list-pdf/price-list-pdf.types';
import { nowHtml, wasHtml } from './template.price';

const D = () => AR.pricing.pdf;

const headHtml = (c: PdfPackageCard, sub: string): string =>
  `<h3>${esc(c.name)}</h3><p class="sub">${esc(c.lessons)} · ${esc(sub)}</p>`;

/** Four 90-minute lessons: one price «per package», the old one beside it with a discount. */
function weeklyHtml(c: PdfPackageCard, symbol: string): string {
  const tiles = c.tiles.map(
    (t) => `<p class="one">${nowHtml(t.price, symbol)}<small>${esc(D().forPackage)}</small>
${wasHtml(t.price)}</p>`,
  );
  const head = headHtml(c, c.tiles[0]?.duration ?? '');
  return `<article class="card">${head}${tiles.join('')}</article>`;
}

/** Twenty lessons a month: one mini tile per lesson length. */
function monthlyHtml(c: PdfPackageCard, symbol: string): string {
  const tiles = c.tiles.map(
    (t) => `<div class="tile"><small>${esc(t.duration)}</small>${nowHtml(t.price, symbol)}
${wasHtml(t.price)}</div>`,
  );
  const sub = `${c.tagline} · ${D().monthlyChoice}`;
  const body = `<div class="tiles">${tiles.join('')}</div>`;
  return `<article class="card">${headHtml(c, sub)}${body}</article>`;
}

/** The weekly and the monthly package, each only when the list has it. */
export function cardsHtml(m: PriceListPdfModel): string {
  const cards = [
    m.weekly === null ? '' : weeklyHtml(m.weekly, m.symbol),
    m.monthly === null ? '' : monthlyHtml(m.monthly, m.symbol),
  ].join('');
  return cards === '' ? '' : `<section class="cards">${cards}</section>`;
}
