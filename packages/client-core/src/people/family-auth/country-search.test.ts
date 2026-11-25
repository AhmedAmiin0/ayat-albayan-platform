import { expect, test } from 'vitest';
import { COUNTRIES, defaultCountry, USUAL } from './countries';
import { orderCountries, searchCountries } from './country-search';

const codes = (list: readonly { code: string }[]) => list.map((c) => c.code);

test('every ISO country with a calling code, each once, with its flag', () => {
  expect(COUNTRIES.length).toBeGreaterThan(240);
  expect(new Set(codes(COUNTRIES)).size).toBe(COUNTRIES.length);
  expect(defaultCountry('PK')).toMatchObject({ dial: '+92', flag: '🇵🇰', en: 'Pakistan' });
});

test('the default country: the phone region when known, else Saudi Arabia', () => {
  expect(defaultCountry('GB').code).toBe('GB');
  expect(defaultCountry('fr').code).toBe('FR');
  expect(defaultCountry('ZZ').code).toBe('SA');
  expect(defaultCountry(null).code).toBe('SA');
});

test('order: the region, the usual countries, then the rest by name in the UI language', () => {
  const ar = orderCountries('GB', 'ar');
  expect(codes(ar.slice(0, 8))).toEqual(['GB', ...USUAL]);
  expect(codes(orderCountries('SA', 'ar').slice(0, 7))).toEqual([...USUAL]);
  const rest = orderCountries(null, 'en').slice(USUAL.length);
  expect(rest[0]?.en).toBe('Afghanistan');
  const names = rest.map((c) => c.en);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
});

test('search by Arabic name (any hamza form), English name or calling code in any digits', () => {
  const all = orderCountries(null, 'ar');
  expect(codes(searchCountries(all, 'باكستان'))).toEqual(['PK']);
  expect(codes(searchCountries(all, 'المانيا'))).toEqual(['DE']);
  expect(codes(searchCountries(all, 'pakis'))).toEqual(['PK']);
  expect(codes(searchCountries(all, '+44')).sort()).toEqual(['GB', 'GG', 'IM', 'JE']);
  expect(codes(searchCountries(all, '٩٢'))).toContain('PK');
  expect(searchCountries(all, 'zzz')).toEqual([]);
  expect(searchCountries(all, '')).toHaveLength(all.length);
});
