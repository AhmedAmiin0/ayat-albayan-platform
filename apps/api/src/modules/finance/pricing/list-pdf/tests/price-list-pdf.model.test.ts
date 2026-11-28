import { describe, expect, it } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import { priceListPdfModel } from '@/modules/finance/pricing/list-pdf/price-list-pdf.model';
import { aPriceList } from './price-list.builder';

const P = ar.pricing;
const D = P.pdf;
const CONTACT = { whatsapp: '+000 00 000 0000', site: 'example.test' };
const at = { country: 'QA', contact: CONTACT };

describe('priceListPdfModel: the main table', () => {
  it('has one row per monthly tier, one price column per lesson length', () => {
    const model = priceListPdfModel(aPriceList().build(), at);
    expect(model.durations).toEqual(['30', '45', '60']);
    expect(model.rows.map((r) => r.name)).toEqual(
      (['starter', 'standard', 'premium', 'bulk'] as const).map((id) => P.packages[id].name),
    );
    expect(model.rows.every((r) => r.prices.length === 3)).toBe(true);
  });

  it('a tier the catalog lacks has no row', () => {
    const model = priceListPdfModel(aPriceList().without('premium', 'monthly').build(), at);
    expect(model.rows.map((r) => r.name)).not.toContain(P.packages.premium.name);
    expect(model.rows).toHaveLength(3);
  });

  it('marks the popular and the best-value tier, with their words and cadence', () => {
    const [starter, standard, , bulk] = priceListPdfModel(aPriceList().build(), at).rows;
    expect(starter).toMatchObject({ tone: null, cadence: D.cadence.starter });
    expect(standard).toMatchObject({ tone: 'popular', tagline: P.packages.standard.tagline });
    expect(bulk).toMatchObject({ tone: 'featured', lessons: P.packages.bulk.sessions });
  });
});

describe('priceListPdfModel: discount on and off', () => {
  it('without a discount: no pill, no struck price, the whole-package caption', () => {
    const model = priceListPdfModel(aPriceList().build(), at);
    expect(model.discount).toBeNull();
    expect(model.caption).toBe(D.wholePackage);
    expect(model.rows[0]?.prices[0]).toEqual({ now: '1,030', was: null });
    expect(model.weekly?.tiles[0]?.price.was).toBeNull();
  });

  it('with a discount: the pill, the caption and every old total struck', () => {
    const model = priceListPdfModel(aPriceList().discounted(12).build(), at);
    expect(model.discount).toBe(D.discount.replace('{pct}', '12'));
    expect(model.caption).toBe(`${D.afterDiscount.replace('{pct}', '12')} — ${D.wholePackage}`);
    expect(model.rows[1]?.prices[2]).toEqual({ now: '1,153', was: '1,160' });
    expect(model.monthly?.tiles[0]?.price).toEqual({ now: '1,423', was: '1,430' });
  });

  it('says for how many students the prices are when more than one', () => {
    const model = priceListPdfModel(aPriceList().forStudents(3).build(), at);
    expect(model.caption).toBe(`${D.wholePackage} · ${D.forStudents.replace('{n}', '3')}`);
  });
});

describe('priceListPdfModel: cards, header and footer', () => {
  it('the weekly card has one price, the monthly one a tile per lesson length', () => {
    const model = priceListPdfModel(aPriceList().build(), at);
    expect(model.weekly).toMatchObject({ name: P.packages.weekly.name });
    expect(model.weekly?.tiles).toHaveLength(1);
    expect(model.monthly?.tiles.map((t) => t.duration)).toEqual(
      (['30', '45', '60'] as const).map((m) =>
        D.lessonMinutes.replace('{duration}', P.durations[m]),
      ),
    );
  });

  it('hides the monthly card when the catalog lacks it', () => {
    expect(priceListPdfModel(aPriceList().without('monthly').build(), at).monthly).toBeNull();
  });

  it('names the country with its flag, the currency and its symbol', () => {
    const model = priceListPdfModel(aPriceList().build(), at);
    expect(model.flag).toBe('🇶🇦');
    expect(model.symbol).toBe(P.currencies.QAR);
    expect(model.pricedIn).toBe(
      D.pricedIn
        .replace('{country}', P.countries.QA)
        .replace('{currency}', D.currencyNames.QAR)
        .replace('{symbol}', P.currencies.QAR),
    );
  });

  it('a list without a country has no flag and the other-country name', () => {
    const model = priceListPdfModel(aPriceList().build(), { ...at, country: undefined });
    expect(model.flag).toBe('');
    expect(model.pricedIn.startsWith(P.otherCountry)).toBe(true);
  });

  it('carries the academy contact from the settings', () => {
    expect(priceListPdfModel(aPriceList().build(), at).contact).toEqual(CONTACT);
  });
});
