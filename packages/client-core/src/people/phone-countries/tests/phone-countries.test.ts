import { describe, expect, it } from 'vitest';
import { countriesOfPhone } from '../phone-countries';

const codes = (phone: string): string[] => countriesOfPhone(phone).map((c) => c.code);

describe('countriesOfPhone — where a number is from, by its calling code', () => {
  it.each([
    ['+201000000005', 'EG', '+20'],
    ['+966501234567', 'SA', '+966'],
    ['+971501234567', 'AE', '+971'],
    ['+923001234567', 'PK', '+92'],
  ])('%s is %s alone', (phone, code, dial) => {
    const found = countriesOfPhone(phone);
    expect(found.map((c) => [c.code, c.dial])).toEqual([[code, dial]]);
  });

  it('is any country, not only the ones the site prices in their own currency', () => {
    expect(codes('+966112345678')).toEqual(['SA']);
    expect(codes('+2348031234567')).toEqual(['NG']);
  });

  it('answers the list entries themselves: names in both languages and the flag', () => {
    expect(countriesOfPhone('+201000000005')).toEqual([
      { code: 'EG', dial: '+20', ar: 'مصر', en: 'Egypt', flag: '🇪🇬' },
    ]);
  });

  it('a shared code is every country that has it, in list order', () => {
    expect(codes('+12025550123')).toEqual(['CA', 'UM', 'US']);
    expect(codes('+14165550101')).toEqual(['CA', 'UM', 'US']);
    expect(codes('+77010000000')).toEqual(['KZ', 'RU']);
    expect(codes('+447700900123')).toEqual(['GB', 'GG', 'IM', 'JE']);
  });

  it('the longest code wins over a shorter one it starts with', () => {
    expect(codes('+12685550101')).toEqual(['AG']);
    expect(codes('+18765550101')).toEqual(['JM']);
    expect(codes('+12425550101')).toEqual(['BS']);
  });

  it.each(['+99912345678', '+21012345678', '+80012345678'])(
    '%s has a code no country in the list has',
    (phone) => {
      expect(countriesOfPhone(phone)).toEqual([]);
    },
  );

  it.each([
    '',
    'abc',
    '+',
    '+20',
    '201000000005',
    '00201000000005',
    '+20 100 000 0005',
    '+0201000000005',
    '+2010000000051234567',
    '+20١٠٠٠٠٠٠٠٠٥',
  ])('%j is not an E.164 number', (phone) => {
    expect(countriesOfPhone(phone)).toEqual([]);
  });
});
