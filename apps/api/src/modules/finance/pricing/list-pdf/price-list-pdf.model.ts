import { flagOf } from '@ab/core';
import { siteCountry, type PriceList } from '@ab/money';
import { ar } from '@/common/infra/i18n/server-text';
import { monthlyCard, tierRows, weeklyCard } from './price-list-pdf.rows';
import type { PdfModelInput, PriceListPdfModel } from './price-list-pdf.types';

const REGIONS = new Intl.DisplayNames(['ar'], { type: 'region' });

const regionName = (code: string): string => REGIONS.of(code) ?? code;

/** The calculator's own name for a site country, the Arabic region name for any other. */
export function countryNameAr(code: string | undefined): string {
  if (code === undefined) return ar.pricing.otherCountry;
  const site = siteCountry(code);
  return site === null ? regionName(code) : ar.pricing.countries[site];
}

function pricedIn(list: PriceList, country: string | undefined): string {
  const P = ar.pricing;
  return P.pdf.pricedIn
    .replace('{country}', countryNameAr(country))
    .replace('{currency}', P.pdf.currencyNames[list.currency])
    .replace('{symbol}', P.currencies[list.currency]);
}

/** «Prices after X% off — whole package», and for how many students when more than one. */
function captionOf(list: PriceList): string {
  const D = ar.pricing.pdf;
  const pct = String(list.discount);
  const off = list.discount > 0 ? [D.afterDiscount.replace('{pct}', pct)] : [];
  const lead = [...off, D.wholePackage].join(' — ');
  const many = list.students > 1 ? [D.forStudents.replace('{n}', String(list.students))] : [];
  return [lead, ...many].join(' · ');
}

export function priceListPdfModel(list: PriceList, at: PdfModelInput): PriceListPdfModel {
  const D = ar.pricing.pdf;
  const discount = list.discount > 0 ? D.discount.replace('{pct}', String(list.discount)) : null;
  return {
    flag: at.country === undefined ? '' : flagOf(at.country),
    pricedIn: pricedIn(list, at.country),
    symbol: ar.pricing.currencies[list.currency],
    discount,
    caption: captionOf(list),
    durations: list.groups.map((g) => String(g.duration)),
    rows: tierRows(list),
    weekly: weeklyCard(list),
    monthly: monthlyCard(list),
    contact: at.contact,
  };
}
