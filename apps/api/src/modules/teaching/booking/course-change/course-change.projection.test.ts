import { describe, expect, it } from 'vitest';
import { RULE_A } from './course-change.fakes';
import { unmaterialised } from './course-change.projection';

// RULE_A: Mondays 17:00 Riyadh from 2026-10-05 to 2026-11-10.
const now = new Date('2026-10-18T08:00:00Z');

describe('unmaterialised — occurrences an old rule still generates before the change point', () => {
  it('between now and the day before the change point, skipping held dates', () => {
    const base = { rules: [RULE_A], now, startsOn: '2026-11-02' };
    expect(unmaterialised({ ...base, held: new Set() })).toBe(2); // 19 + 26 Oct
    expect(unmaterialised({ ...base, held: new Set(['ra:2026-10-19']) })).toBe(1);
  });
  it('never past the rule’s own ends_on, nor before it starts or before now', () => {
    expect(unmaterialised({ rules: [{ ...RULE_A, ends_on: '2026-10-20' }], held: new Set(), now, startsOn: '2026-11-30' })).toBe(1);
    expect(unmaterialised({ rules: [{ ...RULE_A, starts_on: '2026-10-27' }], held: new Set(), now, startsOn: '2026-11-03' })).toBe(1);
    expect(unmaterialised({ rules: [RULE_A], held: new Set(), now, startsOn: '2026-10-19' })).toBe(0);
  });
  it('an open-ended rule stops the day before the change point', () => {
    expect(unmaterialised({ rules: [{ ...RULE_A, ends_on: null }], held: new Set(), now, startsOn: '2026-11-17' })).toBe(5);
  });
});
