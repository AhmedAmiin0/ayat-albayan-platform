import type { TablesUpdate } from '@ab/db';
import type { MessageStatus } from '@ab/shared';

/** Who a phone is. Each is matched by phone_e164 (unique on all three tables). */
export interface Contact {
  guardian: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
  lead: { id: string; name: string | null; follow_up_stage: number } | null;
}

/** The outbound row a status or a reply refers to (by Meta's wamid). */
export interface OutboundRow {
  id: string;
  status: MessageStatus;
  phone_e164: string;
  lesson_id: string | null;
  template_key: string | null;
  body: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  /** The sender's tries; 0 = never sent by us (a message sent outside the app, or imported history). */
  attempts: number;
  guardians: { name: string } | null;
  leads: { name: string | null } | null;
}

export interface StatusMove {
  id: string;
  /** Compare-and-set: only when the row still has this status. */
  from: MessageStatus;
  patch: TablesUpdate<'messages'>;
}
