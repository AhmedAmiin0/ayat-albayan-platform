import { normalizePhone } from '@ab/core';
import { siteCountry, type SiteCountry } from './currency.js';

/** The site country a chat number is quoted in («عرض سعر»: +966 → SA …); null → USD. */
export function pricingCountryOfPhone(phone: string): SiteCountry | null {
  const r = normalizePhone(phone);
  return r.ok ? siteCountry(r.country) : null;
}
