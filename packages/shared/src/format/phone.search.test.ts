import { describe, expect, it } from 'vitest';
import { searchDigits } from './phone.js';

describe('searchDigits (R-STU-02, R-LEAD-01): what a search box matches in phone_e164', () => {
  it.each([
    // Whole international numbers in any format → the E.164 digits.
    ['+966 56 610 1234', '966566101234'],
    ['00966566101234', '966566101234'],
    ['966566101234', '966566101234'],
    ['+20 100 123 4567', '201001234567'],
    // A whole local number → its national digits: found under +966, +971, +20… alike.
    ['0566101234', '566101234'],
    ['0559827935', '559827935'],
    ['01001234567', '1001234567'],
    ['٠٥٦٦١٠١٢٣٤', '566101234'],
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
