import { describe, expect, it } from 'vitest';
import { usedBeforeState, usedBeforeStateSchema } from './used-before-state.js';

const base = {
  id: 'sub-1', current: 2, lessonsTotal: 8, platformUsed: 1,
  cancelled: false, courseBooked: false, pastStart: true,
};

describe('usedBeforeState', () => {
  it('the stored number, the max and nothing blocking', () => {
    expect(usedBeforeState(base)).toEqual({ subscription_id: 'sub-1', lessons_used_before: 2, max: 6, blocked: null });
  });

  it('a future start: max 0 (lowering only)', () => {
    expect(usedBeforeState({ ...base, pastStart: false }).max).toBe(0);
  });

  it('a cancelled package wins over a booked course', () => {
    expect(usedBeforeState({ ...base, courseBooked: true }).blocked).toBe('used_before_course_booked');
    expect(usedBeforeState({ ...base, cancelled: true, courseBooked: true }).blocked).toBe('already_cancelled');
  });

  it('parses its own output', () => {
    expect(usedBeforeStateSchema.parse(usedBeforeState(base))).toEqual(usedBeforeState(base));
  });
});
