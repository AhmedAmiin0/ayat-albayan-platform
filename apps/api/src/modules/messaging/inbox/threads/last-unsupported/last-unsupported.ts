import { adWelcomeOf, isUnsupportedMessage, messageNote, type ThreadNote } from '@ab/shared';
import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';
import type { LastRow } from './last-unsupported.types';

/** A v_threads row, and what its last message shows instead of its content (absent = itself). */
export type ListedThreadRow = ThreadRow & ThreadNote & { last_unsupported?: boolean };

/** Only an inbound row with no text, file or template can be Meta's «content never arrived». */
const empty = (r: ThreadRow) =>
  r.last_direction === 'inbound' && !r.last_body && !r.last_media_mime && !r.last_template_key;

const noteOf = (m: LastRow) =>
  m.direction ? messageNote({ ...m, direction: m.direction, deleted: !!m.deleted_at }) : null;

const unsupported = (r: ThreadRow, m: LastRow): ListedThreadRow =>
  empty(r) && isUnsupportedMessage(m.interactive_payload) ? { ...r, last_unsupported: true } : r;

/** The row as the list shows it: a note replaces the text and the file (deleted rows keep both). */
export function noted(r: ThreadRow, m: LastRow | undefined): ListedThreadRow {
  if (!m) return r;
  const note = noteOf(m);
  if (!note) return unsupported(r, m);
  const body = note === 'ad_welcome' ? adWelcomeOf(m.interactive_payload) : null;
  return { ...r, last_note: note, last_body: body, last_media_mime: null, last_template_key: null };
}
