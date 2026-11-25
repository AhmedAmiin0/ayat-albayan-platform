import { normalizePhone } from '@ab/core';
import { siteCountry, type SiteCountry } from './currency';

/** The site country a chat number is quoted in; null means USD. */
export function pricingCountryOfPhone(phone: string): SiteCountry | null {
  const r = normalizePhone(phone);
  return r.ok ? siteCountry(r.country) : null;
}
