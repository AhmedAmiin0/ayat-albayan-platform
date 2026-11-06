import { z } from 'zod';
import type { MessageView, ThreadView } from './chat/views.js';
import { syncCursorSchema } from './sync-cursor.js';

/** A first sync (no `since`) and every later page: at most this many rows a page (hard cap). */
export const SYNC_LIMIT_DEFAULT = 200;
export const SYNC_LIMIT_MAX = 500;

/** GET /threads/sync?since=<cursor>&limit=<n>: no `since` = from the first row. */
export const threadSyncQuerySchema = z.object({
  since: syncCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(SYNC_LIMIT_MAX).default(SYNC_LIMIT_DEFAULT),
});
export type ThreadSyncQuery = z.output<typeof threadSyncQuerySchema>;

/** The envelope the phone parses (rows keep their full view: looseObject keeps every field). */
export const threadSyncSchema = z.object({
  messages: z.array(
    z.looseObject({
      id: z.string(),
      phone_e164: z.string(),
      updated_at: z.string(),
      created_at: z.string(),
    }),
  ),
  threads: z.array(z.looseObject({ phone_e164: z.string(), last_message_id: z.string() })),
  /** Rows in the page the caller may not see (a sales link template, a reaction / edit marker). */
  gone: z.array(z.string()),
  /** The last scanned row; pass it back as `since` (rewound when `has_more` is false). */
  cursor: z.string().nullable(),
  /** The page was full: ask again from `cursor` at once. */
  has_more: z.boolean(),
  /** Who may see what (role, chats, hidden numbers): a new key = wipe and resync. */
  scope: z.string(),
});
type Envelope = z.infer<typeof threadSyncSchema>;

/** A row as synced: its bubble view plus the keyset stamp. */
export type SyncMessage = MessageView & { updated_at: string };

/** GET /threads/sync answer (docs/43 §5). */
export interface ThreadSync extends Omit<Envelope, 'messages' | 'threads'> {
  messages: SyncMessage[];
  threads: ThreadView[];
}
