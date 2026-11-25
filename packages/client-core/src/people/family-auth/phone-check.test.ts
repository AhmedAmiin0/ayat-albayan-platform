import { expect, test } from 'vitest';
import { defaultCountry } from './countries';
import { checkPhone } from './phone-check';

// Made-up numbers only. The rule is the API's (@ab/core normalizePhone): any country, E.164.
const in_ = (code: string) => defaultCountry(code);

test('Saudi 05…, with or without the 0, in any digits → E.164', () => {
  expect(checkPhone(in_('SA'), '50 000 0005')).toEqual({ state: 'ok', e164: '+966500000005' });
  expect(checkPhone(in_('SA'), '0500000005').e164).toBe('+966500000005');
  expect(checkPhone(in_('SA'), '٠٥٠٠٠٠٠٠٠٥').e164).toBe('+966500000005');
});

test('Egypt local 01…, UK, US and Pakistan national numbers', () => {
  expect(checkPhone(in_('EG'), '010 0000 0005').e164).toBe('+201000000005');
  expect(checkPhone(in_('GB'), '07700 900123').e164).toBe('+447700900123');
  expect(checkPhone(in_('US'), '(202) 555-0123').e164).toBe('+12025550123');
  expect(checkPhone(in_('PK'), '0300 1234567').e164).toBe('+923001234567');
  expect(checkPhone(in_('QA'), '5555 1234').e164).toBe('+97455551234');
});

test('inline: empty, «typing» while too short, «bad» once no digit can make it right', () => {
  expect(checkPhone(in_('SA'), '').state).toBe('empty');
  expect(checkPhone(in_('SA'), '5000').state).toBe('typing');
  expect(checkPhone(in_('GB'), '7700').state).toBe('typing');
  expect(checkPhone(in_('SA'), '400000000').state).toBe('bad');
  expect(checkPhone(in_('SA'), '50000000051').state).toBe('bad');
  expect(checkPhone(in_('PK'), '3001234567890123').state).toBe('bad');
});

test('a whole number with + or 00 is judged as typed', () => {
  expect(checkPhone(in_('SA'), '+44 7700 900123').e164).toBe('+447700900123');
  expect(checkPhone(in_('SA'), '00971 50 000 0005').e164).toBe('+971500000005');
  expect(checkPhone(in_('SA'), '+42').state).toBe('typing');
});
