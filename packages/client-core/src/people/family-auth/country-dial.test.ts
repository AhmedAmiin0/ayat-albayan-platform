import { expect, test } from 'vitest';
import { defaultCountry } from './countries';
import { mainCountryOf, splitInternational } from './country-dial';

const saudi = defaultCountry('SA');
const split = (typed: string, current = saudi) => {
  const s = splitInternational(typed, current);
  return s && { code: s.country.code, national: s.national };
};

test('a pasted whole number picks its country and keeps the national digits', () => {
  expect(split('+44 7700 900123')).toEqual({ code: 'GB', national: '7700900123' });
  expect(split('0044 7700 900123')).toEqual({ code: 'GB', national: '7700900123' });
  expect(split('+٩٢ ٣٠٠ ١٢٣٤٥٦٧')).toEqual({ code: 'PK', national: '3001234567' });
  expect(split('+20 100 000 0005')).toEqual({ code: 'EG', national: '1000000005' });
});

test('the longest calling code wins; a shared one keeps the current country, else the main one', () => {
  expect(split('+1 268 555 0101')).toEqual({ code: 'AG', national: '5550101' });
  expect(split('+1 202 555 0123')).toEqual({ code: 'US', national: '2025550123' });
  expect(split('+1 416 555 0101', defaultCountry('CA'))?.code).toBe('CA');
  expect(split('+7 701 000 0000')?.code).toBe('RU');
});

test('a calling code stands for its main country; one no country has stands for none', () => {
  const main = (dial: string) => mainCountryOf(dial)?.code;
  expect(['+1', '+7', '+44', '+212', '+61'].map(main)).toEqual(['US', 'RU', 'GB', 'MA', 'AU']);
  expect(['+20', '+966'].map(main)).toEqual(['EG', 'SA']);
  expect(['+999', '20', ''].map(main)).toEqual([undefined, undefined, undefined]);
});

test('a national number, or a code not yet whole, is left alone', () => {
  expect(split('0500000005')).toBeNull();
  expect(split('+42')).toBeNull();
  expect(split('00')).toBeNull();
});
