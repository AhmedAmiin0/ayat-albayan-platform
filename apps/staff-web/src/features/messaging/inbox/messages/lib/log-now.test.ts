import { describe, expect, it } from 'vitest';
import { logNow } from './log-now';

const TICK = new Date('2026-10-26T20:59:30Z');

describe('logNow', () => {
  it('keeps the tick (the same object) when no row is newer', () => {
    expect(logNow(TICK, ['2026-10-26T20:00:00Z', undefined])).toBe(TICK);
    expect(logNow(TICK, [])).toBe(TICK);
  });

  it('a row newer than the tick (just past midnight) becomes now', () => {
    expect(logNow(TICK, ['2026-10-26T21:00:10Z', '2026-10-26T20:00:00Z']).toISOString()).toBe('2026-10-26T21:00:10.000Z');
  });

  it('skips unparsable stamps', () => {
    expect(logNow(TICK, ['not a date', ''])).toBe(TICK);
  });
});
