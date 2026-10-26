import { CHAT_SEND_MIMES, type ChatSendMime, type SavedReply, type SavedReplyAttachment } from '@ab/shared';

/** One saved_replies row as the API reads it (migration 20261025000670). */
export interface SavedReplyRow {
  id: string;
  owner_profile_id: string | null;
  title: string;
  body: string;
  attachment_path: string | null;
  attachment_mime: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  position: number;
  updated_at: string;
}

export const REPLY_COLUMNS =
  'id, owner_profile_id, title, body, attachment_path, attachment_mime, attachment_name, attachment_size, position, updated_at' as const;

const sendMime = (mime: string | null): ChatSendMime | null => CHAT_SEND_MIMES.find((m) => m === mime) ?? null;

function attachmentOf(row: SavedReplyRow): SavedReplyAttachment | null {
  const mime = sendMime(row.attachment_mime);
  if (!row.attachment_path || !row.attachment_name || !mime || !row.attachment_size) return null;
  return { name: row.attachment_name, mime, size: row.attachment_size };
}

/** The storage path stays in the API: clients see the file's name, type and size only. */
export function toSavedReply(row: SavedReplyRow): SavedReply {
  return {
    id: row.id,
    scope: row.owner_profile_id === null ? 'shared' : 'mine',
    title: row.title,
    body: row.body,
    attachment: attachmentOf(row),
    position: row.position,
    updated_at: row.updated_at,
  };
}

/** By position, then title (Arabic collation), then id: the order of both lists. */
export function byPosition(a: SavedReplyRow, b: SavedReplyRow): number {
  return a.position - b.position || a.title.localeCompare(b.title, 'ar') || a.id.localeCompare(b.id);
}

/** The shared list first, then the caller's own, each by position. */
export function inListOrder(rows: readonly SavedReplyRow[]): SavedReply[] {
  const shared = rows.filter((r) => r.owner_profile_id === null).sort(byPosition);
  const mine = rows.filter((r) => r.owner_profile_id !== null).sort(byPosition);
  return [...shared, ...mine].map(toSavedReply);
}
