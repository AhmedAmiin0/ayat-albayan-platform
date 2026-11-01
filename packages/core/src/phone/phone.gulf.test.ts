import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone.js';

// R-STU-02 + docs/08 §1: the Gulf pricing countries are inferred from the calling code.
describe('normalizePhone — Gulf country inference', () => {
  it.each([
    ['+971501234567', '+971501234567', 'AE'],
    ['00971 50 123 4567', '+971501234567', 'AE'],
    ['+97142345678', '+97142345678', 'AE'],
    ['+974 5512 3398', '+97455123398', 'QA'],
    ['0096565012345', '+96565012345', 'KW'],
    ['+968 9123 4410', '+96891234410', 'OM'],
  ])('%j → %s (%s)', (input, e164, country) => {
    expect(normalizePhone(input)).toEqual({ ok: true, e164, country });
  });

  it.each(['+9715012345678', '+9711234567', '+9745512339', '+965650123456', '+96891234'])(
    '%s has the wrong length for its country',
    (input) => {
      expect(normalizePhone(input)).toEqual({ ok: false, reason: 'invalid_length' });
    },
  );

  it('bare 971… stays ambiguous without + or 00', () => {
    expect(normalizePhone('971501234567')).toEqual({ ok: false, reason: 'missing_country_code' });
  });
});
