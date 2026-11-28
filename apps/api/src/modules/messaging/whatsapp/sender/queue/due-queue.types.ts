import type { WaLine } from '@ab/catalog';
import type { Lane } from '@/modules/messaging/whatsapp/sender/drain';

/** anyDue(): now, the allow-list, and (a lane's timer pass) its lane. */
export interface AnyDueInput {
  now: Date;
  allowed: readonly string[] | null;
  lane?: Lane;
}

/** DueQueueRepo.due(): SenderRepo's input and what it reads per call. */
export interface DueQuery extends DueInput {
  allowed: readonly string[] | null;
  chatConfigured: boolean;
}

/** The row fields that find a staff alert's teacher. */
export interface StaffAlertRow {
  template_key: string | null;
  dedup_key: string | null;
  phone_e164: string;
}

/** SenderRepo.due(): the approved keys, the batch size, a lane's timer pass. */
export interface DueInput {
  keys: readonly string[];
  now: Date;
  limit: number;
  lane?: Lane;
}

/** SenderRepo.claim(): `line` and `numberId` stamp the row only when given. */
export interface ClaimInput {
  id: string;
  attempts: number;
  now: Date;
  line?: WaLine;
  numberId?: string;
}
