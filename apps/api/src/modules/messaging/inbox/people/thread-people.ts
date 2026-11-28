import type { ThreadPeople } from '@ab/shared';
import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';

/** A thread's row, or a number with no message yet (KnownNumber). */
export type PeopleOf = Pick<ThreadRow, 'guardian_id' | 'guardian_name' | 'lead_id' | 'lead_status'>;

export const guardianOf = (row: PeopleOf | null): ThreadPeople['guardian'] =>
  row?.guardian_id ? { id: row.guardian_id, name: row.guardian_name ?? '' } : null;

export const leadOf = (row: PeopleOf | null): ThreadPeople['lead'] =>
  row?.lead_id && row.lead_status ? { id: row.lead_id, status: row.lead_status } : null;
