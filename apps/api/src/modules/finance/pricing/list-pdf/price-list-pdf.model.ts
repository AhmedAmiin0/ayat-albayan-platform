import {
  durationWords,
  formatAmount,
  packageWords,
  siteCountry,
  type PriceList,
  type Quote,
} from '@ab/money';
import { riyadhToday } from '@ab/time';
import { ar } from '@/common/infra/i18n/server-text';
import type {
  PdfModelInput,
  PdfPriceGroup,
  PdfPriceRow,
  PriceListPdfModel,
} from './price-list-pdf.types';

const REGIONS = new Intl.DisplayNames(['ar'], { type: 'region' });

const regionName = (code: string): string => REGIONS.of(code) ?? code;

/** The calculator's own name for a site country, the Arabic region name for any other. */
export function countryNameAr(code: string | undefined): string {
  if (code === undefined) return ar.pricing.otherCountry;
  const site = siteCountry(code);
  return site === null ? regionName(code) : ar.pricing.countries[site];
}

/** Prices are read from the list as quote() made them: nothing is priced here. */
function rowOf(q: Quote, list: PriceList): PdfPriceRow {
  const unit = ar.pricing.currencies[list.currency];
  const money = (amount: number) => `${formatAmount(amount)} ${unit}`;
  const { name, sessions } = packageWords(q, ar.pricing);
  const before = list.discount > 0 ? money(q.total) : null;
  return { name, lessons: sessions, before, after: money(q.afterDiscount) };
}

function groupsOf(list: PriceList): PdfPriceGroup[] {
  const P = ar.pricing;
  const byDuration = list.groups.map((g) => ({
    title: P.pdf.duration.replace('{duration}', durationWords(g.duration, P)),
    rows: g.packages.map((q) => rowOf(q, list)),
  }));
  return [...byDuration, { title: P.pdf.weekly, rows: [rowOf(list.weekly, list)] }];
}

export function priceListPdfModel(list: PriceList, at: PdfModelInput): PriceListPdfModel {
  const P = ar.pricing;
  const pct = String(list.discount);
  const discount = list.discount > 0 ? P.pdf.discount.replace('{pct}', pct) : null;
  return {
    country: countryNameAr(at.country),
    currency: `${P.pdf.currencyNames[list.currency]} (${P.currencies[list.currency]})`,
    issued: riyadhToday(at.now),
    discount,
    students: list.students,
    groups: groupsOf(list),
    note: P.trialNote,
  };
}
