import type { LeadSource, LeadStatus } from '@ab/shared';

/** The GET /leads row fields the app reads (apps/api LeadRow). */
export interface Lead {
  id: string;
  phone_e164: string;
  name: string | null;
  source: LeadSource;
  status: LeadStatus;
  created_at: string;
  last_inbound_at: string | null;
}
