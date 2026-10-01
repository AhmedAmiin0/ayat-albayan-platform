import { LEAD_STATUSES, type LeadStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { canTransitionLead } from './lead-state-machine';

// Expected table written out independently of the implementation (R-LEAD-01).
const ALLOWED: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'no_reply', 'lost', 'interested_no_slot', 'trial_booked'],
  contacted: ['interested_no_slot', 'trial_booked', 'no_reply', 'lost'],
  interested_no_slot: ['trial_booked', 'no_reply', 'lost'],
  no_reply: ['contacted', 'lost', 'interested_no_slot'],
  trial_booked: ['trial_done', 'no_reply', 'lost'],
  trial_done: ['converted', 'lost', 'interested_no_slot'],
  lost: ['contacted'],
  converted: [],
};

const PAIRS = LEAD_STATUSES.flatMap((from) =>
  LEAD_STATUSES.map((to) => [from, to, ALLOWED[from].includes(to)] as const),
);

describe('LeadStateMachine (R-LEAD-01)', () => {
  it('covers every status pair', () => {
    expect(PAIRS).toHaveLength(LEAD_STATUSES.length ** 2);
  });

  it.each(PAIRS)('%s → %s allowed: %s', (from, to, expected) => {
    expect(canTransitionLead(from, to)).toBe(expected);
  });

  it('never allows a self-transition', () => {
    for (const s of LEAD_STATUSES) expect(canTransitionLead(s, s)).toBe(false);
  });

  it('converted is terminal', () => {
    for (const s of LEAD_STATUSES) expect(canTransitionLead('converted', s)).toBe(false);
  });
});
