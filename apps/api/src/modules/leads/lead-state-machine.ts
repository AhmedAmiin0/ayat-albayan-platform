import type { LeadStatus } from '@ab/shared';

/** Allowed lead status moves (R-LEAD-01 funnel). `converted` is terminal. */
export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ['contacted', 'no_reply', 'lost', 'interested_no_slot', 'trial_booked'],
  contacted: ['interested_no_slot', 'trial_booked', 'no_reply', 'lost'],
  interested_no_slot: ['trial_booked', 'no_reply', 'lost'],
  no_reply: ['contacted', 'lost', 'interested_no_slot'],
  trial_booked: ['trial_done', 'no_reply', 'lost'],
  trial_done: ['converted', 'lost', 'interested_no_slot'],
  lost: ['contacted'],
  converted: [],
};

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS[from].includes(to);
}
