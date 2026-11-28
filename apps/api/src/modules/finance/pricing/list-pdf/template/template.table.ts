import { AR, esc } from '@/modules/reporting/report-pdf';
import type {
  PdfTierRow,
  PdfTone,
  PriceListPdfModel,
} from '@/modules/finance/pricing/list-pdf/price-list-pdf.types';
import { priceHtml } from './template.price';

const D = () => AR.pricing.pdf;

/** A heading with the gold rule and its caption; shared by every section of the page. */
export const sectionHtml = (title: string, caption: string): string =>
  `<h2 class="sec"><span>${esc(title)}</span><i></i><small>${esc(caption)}</small></h2>`;

function headRow(durations: string[]): string {
  const lens = durations.map(
    (d) => `<th class="len"><b>${esc(d)}</b><small>${esc(D().perLesson)}</small></th>`,
  );
  const first = `<th>${esc(AR.pricing.planColumn)}</th><th>${esc(D().lessons)}</th>`;
  return `<tr>${first}${lens.join('')}</tr>`;
}

function badgeHtml(tone: PdfTone): string {
  if (tone === null) return '';
  return `<span class="badge ${tone}">${esc(D().badges[tone])}</span>`;
}

function rowHtml(r: PdfTierRow, symbol: string): string {
  const title = `<b class="name">${esc(r.name)}</b>${badgeHtml(r.tone)}`;
  const name = `<td>${title}<small>${esc(r.tagline)}</small></td>`;
  const lessons = `<td><b>${esc(r.lessons)}</b><small>${esc(r.cadence)}</small></td>`;
  const prices = r.prices.map((p) => `<td class="price">${priceHtml(p, symbol)}</td>`);
  return `<tr class="${r.tone ?? 'plain'}">${name}${lessons}${prices.join('')}</tr>`;
}

/** «Core packages»: one row per tier, one price column per lesson length. */
export function tableHtml(m: PriceListPdfModel): string {
  return [
    sectionHtml(D().basics, m.caption),
    `<table class="tiers"><thead>${headRow(m.durations)}</thead>`,
    `<tbody>${m.rows.map((r) => rowHtml(r, m.symbol)).join('')}</tbody></table>`,
  ].join('');
}
