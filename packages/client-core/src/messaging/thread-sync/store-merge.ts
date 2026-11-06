import type { MessageView, SyncMessage } from '@ab/shared';
import { laterTick } from '../ticks/index.js';

/**
 * The stamp of a row the store holds only from a chat read (never synced yet): before every
 * server stamp, so the first synced copy of it always replaces it.
 */
export const UNSYNCED_AT = '1970-01-01T00:00:00.000000+00:00';

/**
 * A row from a chat read (GET /threads/:phone, a delta, a send's answer) over the stored one
 * of the SAME id (docs/43 43-6). A read carries no sync stamp, so the stored stamp stays: a
 * later sync answer decides by it. Its tick never goes back along queued < sent < delivered <
 * read (laterTick, the 43-1 rank); failed / sent by hand / a retry always come through.
 */
export function mergeRead(held: SyncMessage | undefined, fresh: MessageView): SyncMessage {
  const updated_at = held?.updated_at ?? UNSYNCED_AT;
  return { ...laterTick(held, fresh), updated_at };
}
