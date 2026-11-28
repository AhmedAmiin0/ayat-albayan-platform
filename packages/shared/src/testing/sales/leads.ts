import type { JobApplicantView, LeadListItem, LeadRowView } from '../../sales/leads';

/** A leads row as the lead writes answer it: a fresh lead nobody owns, follow-ups running. */
export const leadRow = (patch: Partial<LeadRowView> = {}): LeadRowView => ({
  id: '22222222-2222-4222-8222-222222222222',
  phone_e164: '+201000000001',
  name: null,
  source: 'whatsapp_direct',
  status: 'new',
  tz: null,
  qualification: {},
  assigned_to: null,
  converted_guardian_id: null,
  follow_up_paused: false,
  follow_up_paused_by: null,
  follow_up_stage: 0,
  follow_up_note: null,
  next_follow_up_at: null,
  last_inbound_at: null,
  last_outbound_at: null,
  created_by: null,
  created_at: '2026-11-01T10:00:00+00:00',
  updated_at: '2026-11-01T10:00:00+00:00',
  ...patch,
});

/** A GET /leads row: the lead row and the follower's name. */
export const leadListItem = (patch: Partial<LeadListItem> = {}): LeadListItem => ({
  ...leadRow(),
  assigned_to_name: null,
  ...patch,
});

/** A job applicant as a lead's reclassify answers it. */
export const jobApplicant = (patch: Partial<JobApplicantView> = {}): JobApplicantView => ({
  id: 'a1111111-1111-4111-8111-111111111111',
  phone_e164: '+201000000001',
  name: null,
  status: 'new',
  cv_url: null,
  recitation_url: null,
  notes: null,
  from_lead_id: null,
  created_by: null,
  created_at: '2026-11-01T10:00:00+00:00',
  updated_at: '2026-11-01T10:00:00+00:00',
  ...patch,
});
