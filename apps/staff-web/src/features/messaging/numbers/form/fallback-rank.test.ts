import { describe, expect, it } from 'vitest';
import { parseRank } from './fallback-rank';

describe('parseRank', () => {
  it.each([
    ['0', 0],
    ['5', 5],
    [' 100 ', 100],
    ['999', 999],
  ])('accepts %s', (text, rank) => expect(parseRank(text)).toBe(rank));

  it.each(['', '-1', '1000', '1.5', '1e2', 'abc', '١٢'])('refuses %s', (text) =>
    expect(parseRank(text)).toBeNull(),
  );
});
