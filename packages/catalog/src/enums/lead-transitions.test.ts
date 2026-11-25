import { describe, expect, it } from 'vitest';
import { LEAD_STATUSES, type LeadStatus } from '.';
import { allowedNextStatuses, canTransitionLead } from './lead-transitions';

// Expected table written out independently of the implementation (R-LEAD-01).
const ALLOWED: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'no_reply', 'lost', 'interested_no_slot', 'trial_booked', 'converted'],
  contacted: ['interested_no_slot', 'trial_booked', 'no_reply', 'lost', 'converted'],
  interested_no_slot: ['trial_booked', 'no_reply', 'lost', 'converted'],
  no_reply: ['contacted', 'lost', 'interested_no_slot', 'converted'],
  trial_booked: ['trial_done', 'no_reply', 'lost', 'converted'],
  trial_done: ['converted', 'lost', 'interested_no_slot'],
  lost: ['contacted', 'converted'],
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

  it.each(LEAD_STATUSES)('allowedNextStatuses(%s) lists the allowed row', (from) => {
    expect(allowedNextStatuses(from)).toEqual(ALLOWED[from]);
  });

  it('any open lead can become مشترك (a paid package booked straight from the chat)', () => {
    const into = LEAD_STATUSES.filter((s) => allowedNextStatuses(s).includes('converted'));
    expect(into).toEqual(LEAD_STATUSES.filter((s) => s !== 'converted'));
  });
});
