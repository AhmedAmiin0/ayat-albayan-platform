import type { MessageView, SyncMessage } from '@ab/shared';
import { laterTick } from '../ticks/index.js';

/**
 * The stamp of a row the store holds only from a chat read (never synced yet): before every
 * server stamp, so the first synced copy of it always replaces it.
 */
export const UNSYNCED_AT = '1970-01-01T00:00:00.000000+00:00';

const synced = (held: SyncMessage | undefined): held is SyncMessage =>
  held !== undefined && held.updated_at !== UNSYNCED_AT;

/**
 * A row from a chat read (GET /threads/:phone, a delta, a send's answer) over the stored one
 * of the SAME id (docs/43 43-6). A read carries no sync stamp, so it can be older than a synced
 * copy: a synced row keeps its own fields and stamp and only takes a tick further along from
 * the read (the next sync decides the rest by its stamp). A row held only from reads (or not
 * held) takes the read, its tick never going back along queued < sent < delivered < read
 * (laterTick, the 43-1 rank); failed / sent by hand / a retry always come through.
 */
export function mergeRead(held: SyncMessage | undefined, fresh: MessageView): SyncMessage {
  if (synced(held)) return { ...laterTick(fresh, held), updated_at: held.updated_at };
  return { ...laterTick(held, fresh), updated_at: UNSYNCED_AT };
}
