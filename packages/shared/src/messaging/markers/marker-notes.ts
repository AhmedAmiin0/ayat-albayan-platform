import type { MessageDirection } from '@ab/catalog';
import { adWelcomeOf } from './chat-markers.js';
import type { HiddenMark } from '../message-actions/hidden.js';
import { payloadTypeOf } from '../payload/index.js';

// What a bubble (or the chats list's last line) shows instead of its own content (owner
// 2026-10-30): a message deleted for everyone, the click-to-WhatsApp ad's automatic welcome
// (Kapso's «errors» echo), or a message the WhatsApp Business app sent that the API cannot read
// («unsupported»).

export type MessageNote = 'deleted' | 'ad_welcome' | 'unsupported';

export interface NoteWords {
  deleted: string;
  adWelcome: string;
  unsupported: string;
}

interface Noted {
  direction: MessageDirection;
  /** Deleted for everyone (messages.deleted_at). */
  deleted?: boolean;
  interactive_payload: unknown;
}

/**
 * The note of a row, null = its own content. An inbound `unsupported` is not one: it is Meta's
 * «content never arrived» (isUnsupportedMessage), worded and handled apart.
 */
export function messageNote(m: Noted): MessageNote | null {
  if (m.deleted) return 'deleted';
  const type = payloadTypeOf(m.interactive_payload);
  if (type === 'errors') return 'ad_welcome';
  return type === 'unsupported' && m.direction === 'outbound' ? 'unsupported' : null;
}

/** The note's words: the ad's own welcome text when the row carries it. */
export function noteText(m: Noted, words: NoteWords): string | null {
  const note = messageNote(m);
  if (note === 'ad_welcome') return adWelcomeOf(m.interactive_payload) ?? words.adWelcome;
  return note ? words[note] : null;
}

/** The chats list's last line for a noted last message (last_body = the ad's own text). */
export function previewNote(
  th: { last_note?: MessageNote | null; last_body: string | null },
  words: NoteWords,
): string | null {
  if (!th.last_note) return null;
  return th.last_note === 'ad_welcome' ? (th.last_body ?? words.adWelcome) : words[th.last_note];
}

/**
 * MessageView's marks (owner 2026-10-30), set by the API from messages.edited_at / deleted_at, and
 * hidden_at («حذف من المنصة», HiddenMark).
 */
export interface MessageMarks extends HiddenMark {
  /** Edited after it was sent («تم التعديل»): body is the new text. Absent = no. */
  edited?: boolean;
  /** Deleted for everyone («تم حذف هذه الرسالة»): body, file and payload withheld. Absent = no. */
  deleted?: boolean;
}

/** ThreadView's: the last message shows a note instead of its content. Absent = none. */
export interface ThreadNote {
  last_note?: MessageNote | null;
}
