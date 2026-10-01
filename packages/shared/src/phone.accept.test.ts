import { describe, expect, it } from 'vitest';
import { E164_RE, normalizePhone } from './phone.js';

// R-STU-02: Saudi and Egyptian formats people actually type / WhatsApp sends.
describe('normalizePhone — accepted (R-STU-02)', () => {
  it.each([
    ['+966501234567', '+966501234567', 'SA'],
    ['00966501234567', '+966501234567', 'SA'],
    ['966501234567', '+966501234567', 'SA'],
    ['0501234567', '+966501234567', 'SA'],
    ['+966 50 123 4567', '+966501234567', 'SA'],
    ['+966-50-123-4567', '+966501234567', 'SA'],
    ['٠٥٠١٢٣٤٥٦٧', '+966501234567', 'SA'],
    ['‎+966501234567‎', '+966501234567', 'SA'],
    ['+20 100 123 4567', '+201001234567', 'EG'],
    ['00201001234567', '+201001234567', 'EG'],
    ['01001234567', '+201001234567', 'EG'],
    ['(+20) 112-345-6789', '+201123456789', 'EG'],
    // Bare international digits, the WhatsApp wa_id shape (no + or 00).
    ['201001234567', '+201001234567', 'EG'],
    ['201123456789', '+201123456789', 'EG'],
    ['201223456789', '+201223456789', 'EG'],
    ['201523456789', '+201523456789', 'EG'],
    ['20 100 123 4567', '+201001234567', 'EG'],
    ['٢٠١٠٠١٢٣٤٥٦٧', '+201001234567', 'EG'],
    ['966551234567', '+966551234567', 'SA'],
  ])('%j → %s (%s)', (input, e164, country) => {
    expect(normalizePhone(input)).toEqual({ ok: true, e164, country });
  });

  it.each([
    ['+447911123456', '+447911123456'],
    ['00971501234567', '+971501234567'],
    ['+1 (415) 555-2671', '+14155552671'],
  ])('other country %s → %s with no inferred country', (input, e164) => {
    expect(normalizePhone(input)).toEqual({ ok: true, e164, country: null });
  });

  it.each(['0501234567', '01001234567', '+447911123456', '966501234567', '201001234567'])(
    '%s output satisfies the DB e164 domain',
    (input) => {
      const r = normalizePhone(input);
      expect(r.ok && E164_RE.test(r.e164)).toBe(true);
    },
  );
});
