import type { LeadSource, LeadStatus } from '@ab/catalog';

// Response rows of GET /leads and GET /job-applicants (apps/api sales/leads, sales/job-applicants).

/** GET /leads row. */
export interface LeadView {
  id: string;
  phone_e164: string;
  name: string | null;
  source: LeadSource;
  status: LeadStatus;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
  /** The salesperson's profile id (null = nobody yet) and name; absent from older payloads. */
  assigned_to?: string | null;
  assigned_to_name?: string | null;
}

/** GET /job-applicants row. */
export interface JobApplicantView {
  id: string;
  phone_e164: string;
  name: string | null;
  /** Includes the pipeline values added by migration 040 (reviewing, interview). */
  status: string;
  cv_url: string | null;
  recitation_url: string | null;
  notes: string | null;
  created_at: string;
}
