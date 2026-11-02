import { describe, expect, it } from 'vitest';
import { pricingCountryOfPhone } from './phone-country.js';

describe('pricingCountryOfPhone («عرض سعر» in the chat)', () => {
  it.each([
    ['+966501234567', 'SA'],
    ['+971501234567', 'AE'],
    ['+97433123456', 'QA'],
    ['+96550123456', 'KW'],
    ['+96891234567', 'OM'],
  ])('%s → %s', (phone, country) => {
    expect(pricingCountryOfPhone(phone)).toBe(country);
  });

  it('is null (USD) for Egypt, any other code and a broken number', () => {
    for (const phone of ['+201001234567', '+447700900123', '+1555', '']) expect(pricingCountryOfPhone(phone)).toBeNull();
  });
});
