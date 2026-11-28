import { packageWords, priceList, type PriceList, type Quote } from '@ab/money';
import { describe, expect, it } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import {
  countryNameAr,
  priceListPdfModel,
} from '@/modules/finance/pricing/list-pdf/price-list-pdf.model';

const NOW = new Date('2030-03-31T22:30:00Z');
const P = ar.pricing;
const list = (o: { discount: number; rounding?: 'up' | 'down' }) =>
  priceList({ country: 'KW', students: 2, ...o });
const kwd = (amount: number) => `${amount} ${P.currencies.KWD}`;

function quoteAt(source: PriceList, group: number, row: number): Quote {
  const q = source.groups[group]?.packages[row];
  if (!q) throw new Error(`no package ${group}/${row}`);
  return q;
}

describe('priceListPdfModel', () => {
  it('lists every package of every duration, then the weekly one', () => {
    const source = list({ discount: 0 });
    const model = priceListPdfModel(source, { country: 'KW', now: NOW });
    expect(model.groups).toHaveLength(source.groups.length + 1);
    const names = model.groups.slice(0, -1).map((g) => g.rows.map((r) => r.name));
    const expected = source.groups.map((g) => g.packages.map((q) => packageWords(q, P).name));
    expect(names).toEqual(expected);
    expect(model.groups.at(-1)).toMatchObject({ title: P.pdf.weekly });
  });

  it('without a discount has one price per row, the list total in the currency', () => {
    const source = list({ discount: 0 });
    const model = priceListPdfModel(source, { country: 'KW', now: NOW });
    expect(model.discount).toBeNull();
    expect(model.groups[0]?.rows[0]).toEqual({
      name: P.packages.starter.name,
      lessons: P.packages.starter.sessions,
      before: null,
      after: kwd(quoteAt(source, 0, 0).afterDiscount),
    });
  });

  it('with a discount strikes the total and shows the rounded price after it', () => {
    const source = list({ discount: 15, rounding: 'up' });
    const model = priceListPdfModel(source, { country: 'KW', now: NOW });
    const q = quoteAt(source, 2, 3);
    expect(model.discount).toBe(P.pdf.discount.replace('{pct}', '15'));
    expect(model.groups[2]?.rows[3]).toMatchObject({
      before: kwd(q.total),
      after: kwd(q.afterDiscount),
    });
    expect(q.afterDiscount).not.toBe(q.total);
  });

  it('names the currency and dates the issue on the Riyadh calendar', () => {
    const model = priceListPdfModel(list({ discount: 0 }), { country: 'KW', now: NOW });
    expect(model).toMatchObject({
      country: P.countries.KW,
      currency: `${P.pdf.currencyNames.KWD} (${P.currencies.KWD})`,
      issued: '2030-04-01',
      students: 2,
    });
  });
});

describe('countryNameAr', () => {
  it('a site country by the calculator name, another by its Arabic region name', () => {
    expect(countryNameAr('SA')).toBe(P.countries.SA);
    expect(countryNameAr('EG')).toBe(new Intl.DisplayNames(['ar'], { type: 'region' }).of('EG'));
  });

  it('no country is the calculator other-country label', () => {
    expect(countryNameAr(undefined)).toBe(P.otherCountry);
  });
});
