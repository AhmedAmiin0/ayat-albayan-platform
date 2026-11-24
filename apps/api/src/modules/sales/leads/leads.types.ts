import type { LeadSource } from '@ab/catalog';

export interface InboundContact {
  /** Raw WhatsApp / typed phone; normalised to E.164 (rule 7). */
  phone: string;
  /** WhatsApp profile name; only fills an empty lead name. */
  name?: string | null;
  /** Used for a new lead only; an existing lead keeps its source. */
  source?: LeadSource;
  /** Message time (UTC); defaults to now. */
  at?: Date;
}

export interface LeadAction {
  id: string;
  actorId: string | null;
}
