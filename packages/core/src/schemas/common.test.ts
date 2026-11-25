import { describe, expect, it } from 'vitest';
import { instant, localDate } from './common';

describe('localDate', () => {
  it('accepts a calendar day', () => {
    expect(localDate.safeParse('2026-02-28').success).toBe(true);
  });

  it('rejects a day that does not exist or carries a time', () => {
    expect(localDate.safeParse('2026-02-30').success).toBe(false);
    expect(localDate.safeParse('2026-02-28T10:00:00Z').success).toBe(false);
  });
});

describe('instant', () => {
  it('accepts an ISO instant with an offset or Z', () => {
    expect(instant.safeParse('2026-11-22T10:30:00+03:00').success).toBe(true);
    expect(instant.safeParse('2026-11-22T07:30:00Z').success).toBe(true);
  });

  it('rejects a wall-clock time without an offset', () => {
    expect(instant.safeParse('2026-11-22T10:30:00').success).toBe(false);
  });
});
