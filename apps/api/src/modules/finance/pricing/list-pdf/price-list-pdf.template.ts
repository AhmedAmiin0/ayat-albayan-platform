import { AR, esc, ltr, type PdfAssets } from '@/modules/reporting/report-pdf';
import { PRICE_LIST_CSS } from './price-list-pdf.css';
import type { PdfPriceGroup, PdfPriceRow, PriceListPdfModel } from './price-list-pdf.types';

const P = () => AR.pricing.pdf;

function headerHtml(logo: string): string {
  return [
    '<header class="head">',
    `<div class="logo"><img src="${logo}" alt="${esc(AR.app.name)}"></div>`,
    `<h1 class="academy">${esc(AR.app.name)}</h1>`,
    `<p class="tagline">${esc(AR.reports.pdf.tagline)}</p>`,
    `<div class="cartouche">${esc(P().title)}</div>`,
    '</header>',
  ].join('');
}

const cell = (label: string, value: string): string =>
  `<div class="cell"><div class="k">${esc(label)}</div><div class="v">${value}</div></div>`;

/** Country, currency and date; the students only when the prices are for more than one. */
function metaHtml(m: PriceListPdfModel): string {
  const students = m.students > 1 ? [cell(AR.pricing.studentsLabel, ltr(String(m.students)))] : [];
  return [
    '<section class="meta">',
    cell(P().country, esc(m.country)),
    cell(P().currency, esc(m.currency)),
    cell(P().issued, ltr(m.issued)),
    ...students,
    '</section>',
  ].join('');
}

const offerHtml = (discount: string | null): string =>
  discount === null ? '' : `<p class="offer">${esc(discount)}</p>`;

function headRow(discounted: boolean): string {
  const prices = discounted ? [P().priceBefore, P().priceAfter] : [P().price];
  const cols = [AR.pricing.planColumn, P().lessons, ...prices];
  return `<tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`;
}

function rowHtml(r: PdfPriceRow): string {
  const was = r.before === null ? '' : `<td><s class="was">${esc(r.before)}</s></td>`;
  const now = `<td class="now">${esc(r.after)}</td>`;
  return `<tr><td>${esc(r.name)}</td><td>${esc(r.lessons)}</td>${was}${now}</tr>`;
}

function groupHtml(g: PdfPriceGroup, discounted: boolean): string {
  return [
    `<h2 class="sec">${esc(g.title)}</h2>`,
    `<table class="prices"><thead>${headRow(discounted)}</thead>`,
    `<tbody>${g.rows.map(rowHtml).join('')}</tbody></table>`,
  ].join('');
}

/**
 * A country's whole price list as one A4 page: the report PDF's frame and header, then one table
 * per lesson length. Pure: the same model gives the same HTML.
 */
export function priceListHtml(m: PriceListPdfModel, assets: PdfAssets): string {
  const discounted = m.discount !== null;
  return [
    '<!doctype html><html lang="ar" dir="rtl" data-theme="light"><head><meta charset="utf-8">',
    `<title>${esc(P().title)}</title>`,
    `<style>${assets.fontCss}\n${PRICE_LIST_CSS}</style></head>`,
    '<body><main class="frame"><div class="inner">',
    headerHtml(assets.logo),
    metaHtml(m),
    offerHtml(m.discount),
    ...m.groups.map((g) => groupHtml(g, discounted)),
    `<p class="note">${esc(m.note)}</p>`,
    '</div></main></body></html>',
  ].join('\n');
}
