import { describe, expect, it } from 'vitest';
import { atOrAfter, micros } from './channel-instant';

describe('instants to the microsecond (Postgres timestamptz)', () => {
  it('keeps the digits a Date drops, whatever the offset', () => {
    expect(micros('2026-11-17T10:00:00.123456+00:00') - micros('2026-11-17T10:00:00.123Z')).toBe(456);
    expect(micros('2026-11-17T13:00:00.5+03:00')).toBe(micros('2026-11-17T10:00:00.500000Z'));
    expect(micros('2026-11-17T10:00:00Z') % 1000).toBe(0);
    expect(micros('soon')).toBeNaN();
  });

  it('a mark at 123400 µs has not read a message at 123900 µs; equal counts as read', () => {
    const msg = '2026-11-17T10:00:00.1239+00:00';
    expect(atOrAfter('2026-11-17T10:00:00.1234+00:00', msg)).toBe(false);
    expect(atOrAfter(msg, '2026-11-17T10:00:00.123900Z')).toBe(true);
    expect(atOrAfter('2026-11-17T10:00:01Z', msg)).toBe(true);
  });
});
