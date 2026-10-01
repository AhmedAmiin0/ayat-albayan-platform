import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone.js';

// R-STU-02: validation rejects handles / short numbers.
describe('normalizePhone — rejected (R-STU-02)', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['@sohaila_88', 'not_a_number'],
    ['sohaila', 'not_a_number'],
    ['+96650abc4567', 'not_a_number'],
    ['12345', 'missing_country_code'],
    ['501234567', 'missing_country_code'],
    ['+966 50 123', 'invalid_length'],
    ['+9665012345678', 'invalid_length'],
    ['+966301234567', 'invalid_length'],
    ['+20100123456', 'invalid_length'],
    ['+1234567', 'invalid_length'],
    ['+0501234567', 'invalid_length'],
  ])('%j → %s', (input, reason) => {
    expect(normalizePhone(input)).toEqual({ ok: false, reason });
  });
});
