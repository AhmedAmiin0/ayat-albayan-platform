import { describe, expect, it } from 'vitest';
import { searchDigits } from './phone.js';

describe('searchDigits (R-STU-02, R-LEAD-01): what a search box matches in phone_e164', () => {
  it.each([
    // Whole numbers in any format → the E.164 digits.
    ['0566101234', '966566101234'],
    ['+966 56 610 1234', '966566101234'],
    ['00966566101234', '966566101234'],
    ['966566101234', '966566101234'],
    ['01001234567', '201001234567'],
    ['+20 100 123 4567', '201001234567'],
    ['٠٥٦٦١٠١٢٣٤', '966566101234'],
    // Partial numbers: digits from any keyboard, noise stripped, a leading 00 / 0 dropped.
    ['٥٦٦١٠', '56610'],
    ['۵۶۶۱۰', '56610'],
    ['٠٥٦ 610', '56610'],
    ['056-610', '56610'],
    ['(056) 61.0', '56610'],
    ['+9665', '9665'],
    ['00966 56', '96656'],
    ['4567', '4567'],
    ['123', '123'],
    ['0050', '50'],
  ])('%s → %s', (term, digits) => {
    expect(searchDigits(term)).toBe(digits);
  });

  it.each(['سهيلة', 'ام جود', 'AB-0183', '12', '٥٦', '0 5', '', '  ', 'ام جود 0566'])('%s → null (name search)', (term) => {
    expect(searchDigits(term)).toBeNull();
  });
});
