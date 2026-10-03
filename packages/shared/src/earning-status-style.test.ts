import { describe, expect, it } from 'vitest';
import { EARNING_STATUSES } from './money/earnings.js';
import { earningStatusStyle } from './status-style.js';

describe('earningStatusStyle', () => {
  it('every earning status is mapped; only paid is ok; never saffron (the teacher is not the one to act)', () => {
    expect(Object.keys(earningStatusStyle).sort()).toEqual([...EARNING_STATUSES].sort());
    expect(EARNING_STATUSES.filter((s) => earningStatusStyle[s].tone === 'ok')).toEqual(['paid']);
    expect(EARNING_STATUSES.some((s) => earningStatusStyle[s].tone === 'act')).toBe(false);
    expect(EARNING_STATUSES.map((s) => earningStatusStyle[s].glyph)).toEqual(['hollow', 'half', 'fill']);
  });
});
