import { describe, expect, it } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import { priceListHtml } from '@/modules/finance/pricing/list-pdf/price-list-pdf.template';
import { aPdfModel, STUB_ASSETS } from './price-list-pdf.fixture';

const P = ar.pricing.pdf;

describe('priceListHtml', () => {
  it('without a discount: one price column, matches the reviewed HTML', async () => {
    const html = priceListHtml(aPdfModel(false), STUB_ASSETS);
    await expect(html).toMatchFileSnapshot('__snapshots__/price-list-plain.html');
    expect(html).not.toContain('<s class="was">');
    expect(html).not.toContain(P.priceBefore);
    expect(html).toContain(`<th>${P.price}</th>`);
  });

  it('with a discount: the header says it, each row strikes the old price', async () => {
    const html = priceListHtml(aPdfModel(true), STUB_ASSETS);
    await expect(html).toMatchFileSnapshot('__snapshots__/price-list-discount.html');
    expect(html).toContain('<p class="offer">خصم 15% على جميع الباقات</p>');
    expect(html).toContain(`<th>${P.priceBefore}</th><th>${P.priceAfter}</th>`);
    expect(html).toContain('<td><s class="was">24 ر.س</s></td><td class="now">20 ر.س</td>');
    expect(html).toContain(`<div class="k">${ar.pricing.studentsLabel}</div>`);
  });

  it('is an RTL Arabic page with the logo, academy name, country, currency and date', () => {
    const html = priceListHtml(aPdfModel(false), STUB_ASSETS);
    expect(html).toContain('<html lang="ar" dir="rtl" data-theme="light">');
    expect(html).toContain(`<img src="${STUB_ASSETS.logo}" alt="${ar.app.name}">`);
    expect(html).toContain(`<div class="cartouche">${P.title}</div>`);
    for (const value of ['السعودية', 'ريال سعودي (ر.س)'])
      expect(html).toContain(`<div class="v">${value}</div>`);
    expect(html).toContain('<bdi dir="ltr" class="ltr">2030-04-01</bdi>');
    expect(html).not.toContain(`<div class="k">${ar.pricing.studentsLabel}</div>`);
  });

  it('escapes what it prints', () => {
    const model = { ...aPdfModel(false), country: '<b>x</b>' };
    expect(priceListHtml(model, STUB_ASSETS)).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
