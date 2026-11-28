import { afterEach, describe, expect, it, vi } from 'vitest';
import { legacyResult } from './course-pause.mapper';

const SUB = '00000000-0000-4000-8000-0000000000a1';

describe('legacyResult', () => {
  afterEach(() => vi.useRealTimers());

  it('answers a lifted package-only pause as resumed now, with nothing moved', () => {
    vi.useFakeTimers({ now: new Date('2026-11-28T22:30:00Z') });
    expect(legacyResult(SUB)).toEqual({
      pause: {
        id: SUB,
        from_date: '2026-11-29',
        until_date: null,
        reason: null,
        created_at: '2026-11-28T22:30:00.000Z',
        created_by_name: null,
        resumed_at: '2026-11-28T22:30:00.000Z',
        extended_days: 0,
      },
      cancelled: 0,
      left: 0,
      reopened: 0,
      conflicts: 0,
    });
  });
});
