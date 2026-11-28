import { describe, expect, it } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import { countryNameAr } from '@/modules/finance/pricing/list-pdf/price-list-pdf.model';

const P = ar.pricing;

describe('countryNameAr', () => {
  it('a site country by the calculator name, another by its Arabic region name', () => {
    expect(countryNameAr('SA')).toBe(P.countries.SA);
    expect(countryNameAr('EG')).toBe(new Intl.DisplayNames(['ar'], { type: 'region' }).of('EG'));
  });

  it('no country is the calculator other-country label', () => {
    expect(countryNameAr(undefined)).toBe(P.otherCountry);
  });
});
