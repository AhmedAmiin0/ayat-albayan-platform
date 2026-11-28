import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';

/** The page's last message, read by pk (last-unsupported.repo.ts). */
export interface LastRow {
  id: string;
  direction: ThreadRow['last_direction'];
  interactive_payload: unknown;
  deleted_at: string | null;
}
