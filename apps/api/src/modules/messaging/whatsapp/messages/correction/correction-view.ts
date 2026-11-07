import type { MessageView } from '@ab/shared';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';

/**
 * «تعديل» = a correction (owner 2026-11-07): every view carries the link (corrects_id, the
 * correction's side; the original's «صُحِّحت» is found by the clients from it) and who of staff
 * wrote it (sent_by_id: the menu's «تعديل» is the author's or an admin's).
 */
export function withCorrection(
  view: MessageView,
  row: Pick<ThreadMessageRow, 'corrects_id' | 'created_by' | 'direction'>,
): MessageView {
  const sentBy = row.direction === 'outbound' ? row.created_by : null;
  return { ...view, corrects_id: row.corrects_id, sent_by_id: sentBy };
}
