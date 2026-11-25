import type { LeadStatus } from '.';

/** Allowed lead status moves (R-LEAD-01 funnel). `converted` is terminal. */
export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ['contacted', 'no_reply', 'lost', 'interested_no_slot', 'trial_booked', 'converted'],
  contacted: ['interested_no_slot', 'trial_booked', 'no_reply', 'lost', 'converted'],
  interested_no_slot: ['trial_booked', 'no_reply', 'lost', 'converted'],
  no_reply: ['contacted', 'lost', 'interested_no_slot', 'converted'],
  trial_booked: ['trial_done', 'no_reply', 'lost', 'converted'],
  trial_done: ['converted', 'lost', 'interested_no_slot'],
  lost: ['contacted', 'converted'],
  converted: [],
};

/** Statuses a lead may move to from `from`; the API judges every move with the same table. */
export function allowedNextStatuses(from: LeadStatus): readonly LeadStatus[] {
  return LEAD_TRANSITIONS[from];
}

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS[from].includes(to);
}
