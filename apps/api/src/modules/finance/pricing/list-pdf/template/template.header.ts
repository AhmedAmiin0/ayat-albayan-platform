import { AR, esc } from '@/modules/reporting/report-pdf';
import type { PriceListPdfModel } from '@/modules/finance/pricing/list-pdf/price-list-pdf.types';

const D = () => AR.pricing.pdf;

function titleHtml(): string {
  const h = D().headline;
  return `<h1 class="title">${esc(h.lead)} <em>${esc(h.accent)}</em> ${esc(h.tail)}</h1>`;
}

function pillsHtml(m: PriceListPdfModel): string {
  const flag = m.flag === '' ? '' : `<span class="flag">${m.flag}</span> `;
  const discount = m.discount === null ? '' : `<span class="pill gold">${esc(m.discount)}</span>`;
  return `<p class="pills"><span class="pill">${flag}${esc(m.pricedIn)}</span>${discount}</p>`;
}

/** Deep green band: the logo card on the right, the kicker, title, country pills and intro. */
export function headerHtml(m: PriceListPdfModel, logo: string): string {
  return [
    '<header class="head">',
    `<div class="logo"><img src="${logo}" alt="${esc(AR.app.name)}"></div>`,
    '<div class="head-text">',
    `<p class="kicker">${esc(D().kicker)}</p>`,
    titleHtml(),
    pillsHtml(m),
    `<p class="intro">${esc(D().intro)}</p>`,
    '</div></header>',
  ].join('');
}
