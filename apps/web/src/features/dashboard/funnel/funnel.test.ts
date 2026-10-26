import { describe, expect, it } from 'vitest';
import { funnelSteps } from './funnel';

const zero = {
  new: 0,
  contacted: 0,
  interested_no_slot: 0,
  trial_booked: 0,
  trial_done: 0,
  converted: 0,
  no_reply: 0,
  lost: 0,
};

describe('funnelSteps (R-RPT-01)', () => {
  it('a lead counts at every stage up to its current one; rates are stage over the previous stage', () => {
    const steps = funnelSteps({ ...zero, new: 3, contacted: 1, lost: 1, trial_booked: 1, trial_done: 2, converted: 2 });
    expect(steps).toEqual([
      { stage: 'new', reached: 10, rate: null },
      { stage: 'trial_booked', reached: 5, rate: 0.5 },
      { stage: 'trial_done', reached: 4, rate: 0.8 },
      { stage: 'converted', reached: 2, rate: 0.5 },
    ]);
  });

  it('no leads: every stage 0 and no rates (nothing to divide by)', () => {
    expect(funnelSteps(zero).map((s) => [s.reached, s.rate])).toEqual([
      [0, null],
      [0, null],
      [0, null],
      [0, null],
    ]);
  });
});
