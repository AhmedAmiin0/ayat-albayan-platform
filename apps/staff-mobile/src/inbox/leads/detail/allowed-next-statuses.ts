import type { LeadStatus } from '@ab/shared';

// Copy of apps/api/src/modules/leads/lead-state-machine.ts (mobile cannot import the API).
// The API still judges every move (409 invalid_transition); this only hides moves it would refuse.
// ponytail: duplicated table; hoist LEAD_TRANSITIONS into @ab/shared so both read one source.
const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ['contacted', 'no_reply', 'lost', 'interested_no_slot', 'trial_booked', 'converted'],
  contacted: ['interested_no_slot', 'trial_booked', 'no_reply', 'lost', 'converted'],
  interested_no_slot: ['trial_booked', 'no_reply', 'lost', 'converted'],
  no_reply: ['contacted', 'lost', 'interested_no_slot', 'converted'],
  trial_booked: ['trial_done', 'no_reply', 'lost', 'converted'],
  trial_done: ['converted', 'lost', 'interested_no_slot'],
  lost: ['contacted', 'converted'],
  converted: [],
};

/** Statuses a lead may move to from `from` (R-LEAD-01 funnel). `converted` is terminal. */
export function allowedNextStatuses(from: LeadStatus): readonly LeadStatus[] {
  return LEAD_TRANSITIONS[from];
}
