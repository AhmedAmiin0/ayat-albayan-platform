import type { LeadSource, LeadStatus } from '@ab/catalog';

// Response rows of GET /leads (apps/api sales/leads).

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
