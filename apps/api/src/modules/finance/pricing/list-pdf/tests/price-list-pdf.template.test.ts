import { describe, expect, it } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import { priceListHtml } from '@/modules/finance/pricing/list-pdf/template';
import { aPdfModel, STUB_ASSETS, STUB_CONTACT } from './price-list-pdf.fixture';

const D = ar.pricing.pdf;
const html = (discount = 0) => priceListHtml(aPdfModel(discount), STUB_ASSETS);

describe('priceListHtml: page and header', () => {
  it('is an RTL Arabic page with the logo card, kicker, headline and intro', () => {
    const page = html();
    expect(page).toContain('<html lang="ar" dir="rtl" data-theme="light">');
    expect(page).toContain(`<img src="${STUB_ASSETS.logo}" alt="${ar.app.name}">`);
    expect(page).toContain(D.kicker);
    expect(page).toContain(`<em>${D.headline.accent}</em>`);
    expect(page).toContain(D.intro);
    expect(page).toContain('🇶🇦');
  });

  it('escapes what it prints', () => {
    const model = { ...aPdfModel(), pricedIn: '<b>x</b>' };
    expect(priceListHtml(model, STUB_ASSETS)).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('priceListHtml: discount on and off', () => {
  it('without a discount: no gold pill, no «instead of», matches the reviewed HTML', async () => {
    const page = html();
    await expect(page).toMatchFileSnapshot('__snapshots__/price-list-plain.html');
    expect(page).not.toContain('class="pill gold"');
    expect(page).not.toContain(D.insteadOf);
    expect(page).not.toContain('<s>');
  });

  it('with a discount: the gold pill, and each price strikes its old one', async () => {
    const page = html(15);
    await expect(page).toMatchFileSnapshot('__snapshots__/price-list-discount.html');
    expect(page).toContain(`<span class="pill gold">${D.discount.replace('{pct}', '15')}</span>`);
    expect(page).toContain(`<span class="was">${D.insteadOf} <s>1,030</s></span>`);
    expect(page).toContain('<b class="now">1,023</b>');
  });
});

describe('priceListHtml: table, cards and footer', () => {
  it('a header column per lesson length and badges on the two marked rows', () => {
    const page = html();
    expect(page.match(/<th class="len">/g)).toHaveLength(3);
    expect(page).toContain(`<tr class="popular">`);
    expect(page).toContain(`<span class="badge popular">${D.badges.popular}</span>`);
    expect(page).toContain(`<span class="badge featured">${D.badges.featured}</span>`);
  });

  it('shows the package cards the model has and hides a missing one', () => {
    expect(html()).toContain(ar.pricing.packages.monthly.name);
    const page = priceListHtml({ ...aPdfModel(), monthly: null }, STUB_ASSETS);
    expect(page).not.toContain(ar.pricing.packages.monthly.name);
    expect(page).toContain(ar.pricing.packages.weekly.name);
  });

  it('prints the programs, the promises and the contact from the settings', () => {
    const page = html();
    for (const t of [D.programs.quran.title, D.features.women.sub, D.guarantee.title])
      expect(page).toContain(t);
    expect(page).toContain(STUB_CONTACT.whatsapp);
    expect(page).toContain(STUB_CONTACT.site);
  });

  it('leaves the site pill out when the academy has no site', () => {
    const model = { ...aPdfModel(), contact: { whatsapp: STUB_CONTACT.whatsapp } };
    expect(priceListHtml(model, STUB_ASSETS)).not.toContain('class="pill site"');
  });
});
