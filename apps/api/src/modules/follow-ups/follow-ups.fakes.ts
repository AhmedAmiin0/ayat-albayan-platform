import type { FollowUpLeadRow } from './follow-ups.plan';

// Invented sample data for the follow-up tests: no real lead.

/** A no_reply lead whose last message was 1 Oct 10:00Z: stage 0 is due 2 Oct 10:00Z (24 h). */
export function sampleLead(over: Partial<FollowUpLeadRow> = {}): FollowUpLeadRow {
  return {
    id: 'lead-1',
    phone_e164: '+966500000301',
    tz: null,
    qualification: {},
    status: 'no_reply',
    follow_up_paused: false,
    follow_up_stage: 0,
    last_inbound_at: '2026-10-01T10:00:00Z',
    created_at: '2026-09-30T08:00:00Z',
    next_follow_up_at: null,
    ...over,
  };
}
