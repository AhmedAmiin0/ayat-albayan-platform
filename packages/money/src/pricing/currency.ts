// Quote currency per guardian country (docs/08 §1). The site's five countries keep their own
// currency; every other or unknown country is quoted in USD (owner rule, 2026-10-02).
// Arabic country names and currency symbols live in ar.json `pricing.countries` / `pricing.currencies`;
// the English symbol is the ISO code (as on the site).

export const SITE_COUNTRIES = ['SA', 'AE', 'QA', 'KW', 'OM'] as const;
export type SiteCountry = (typeof SITE_COUNTRIES)[number];

export const CURRENCY_ISOS = ['SAR', 'AED', 'QAR', 'KWD', 'OMR', 'USD'] as const;
export type CurrencyIso = (typeof CURRENCY_ISOS)[number];

export interface Currency {
  iso: CurrencyIso;
  /** Site priceDivisor: SAR base ÷ divisor, ceiled. USD has none; it converts with the FX rate. */
  divisor: number | null;
}

/** The site's Xc, per country. AED/QAR use the SAR numbers as-is (the site's choice, not FX). */
export const SITE_CURRENCIES: Readonly<Record<SiteCountry, Currency>> = {
  SA: { iso: 'SAR', divisor: 1 },
  AE: { iso: 'AED', divisor: 1 },
  QA: { iso: 'QAR', divisor: 1 },
  KW: { iso: 'KWD', divisor: 10 },
  OM: { iso: 'OMR', divisor: 10 },
};
export const USD: Currency = { iso: 'USD', divisor: null };

/** ExchangeRate-API open access requires this attribution link next to converted prices. */
export const FX_ATTRIBUTION_URL = 'https://www.exchangerate-api.com';

/** Official SAR/USD peg; the last-resort rate when no API rate was ever stored (docs/08 §4). */
export const SAR_PER_USD_PEG = 3.75;

/** 'sa', ' SA ' → 'SA'; anything not one of the site's countries → null. */
export function siteCountry(country: string | null | undefined): SiteCountry | null {
  const code = country?.trim().toUpperCase();
  return SITE_COUNTRIES.find((c) => c === code) ?? null;
}

/** The currency a guardian in `country` is quoted in: the site's, else USD. */
export function currencyForCountry(country: string | null | undefined): Currency {
  const code = siteCountry(country);
  return code ? SITE_CURRENCIES[code] : USD;
}
