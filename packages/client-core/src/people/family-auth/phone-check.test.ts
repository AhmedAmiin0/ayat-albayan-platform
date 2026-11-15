import { expect, test } from 'vitest';
import { COUNTRIES, countryOf, defaultCountry, type Country } from './countries.js';
import { checkPhone } from './phone-check.js';

const country = (code: Country['code']) => countryOf(code, defaultCountry('SA'));

test('Saudi national number, with or without the 0, in any digits → E.164', () => {
  expect(checkPhone(country('SA'), '50 000 0005')).toEqual({ state: 'ok', e164: '+966500000005' });
  expect(checkPhone(country('SA'), '0500000005').e164).toBe('+966500000005');
  expect(checkPhone(country('SA'), '٠٥٠٠٠٠٠٠٠٥').e164).toBe('+966500000005');
});

test('inline: empty, then «typing» while short, «bad» once long enough and wrong', () => {
  expect(checkPhone(country('SA'), '').state).toBe('empty');
  expect(checkPhone(country('SA'), '5000').state).toBe('typing');
  expect(checkPhone(country('SA'), '400000000').state).toBe('bad');
  expect(checkPhone(country('SA'), '4000000001').state).toBe('bad');
});

test('the picked country decides the calling code (Qatar 8, Egypt 10)', () => {
  expect(checkPhone(country('QA'), '5555 1234').e164).toBe('+97455551234');
  expect(checkPhone(country('EG'), '010 0000 0005').e164).toBe('+201000000005');
  expect(checkPhone(country('KW'), '6000').state).toBe('typing');
  expect(checkPhone(country('BH'), '36001').state).toBe('typing');
  expect(checkPhone(country('BH'), '3600 1234').e164).toBe('+97336001234');
});

test('a whole number with + or 00 ignores the picker (another country)', () => {
  expect(checkPhone(country('SA'), '+44 7700 900123').e164).toBe('+447700900123');
  expect(checkPhone(country('SA'), '00971 50 000 0005').e164).toBe('+971500000005');
  expect(checkPhone(country('SA'), '+44').state).toBe('typing');
});

test('the default country: the phone region when ours, else Saudi Arabia', () => {
  expect(defaultCountry('QA').code).toBe('QA');
  expect(defaultCountry('FR').code).toBe('SA');
  expect(defaultCountry(null).code).toBe('SA');
  expect(COUNTRIES.map((c) => c.code)).toEqual(['SA', 'AE', 'QA', 'KW', 'OM', 'BH', 'EG']);
});
