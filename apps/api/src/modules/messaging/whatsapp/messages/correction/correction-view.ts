import type { MessageView } from '@ab/shared';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';

/** Views carry corrects_id and sent_by_id, since only the author or an admin may correct. */
export function withCorrection(
  view: MessageView,
  row: Pick<ThreadMessageRow, 'corrects_id' | 'created_by' | 'direction'>,
): MessageView {
  const sentBy = row.direction === 'outbound' ? row.created_by : null;
  return { ...view, corrects_id: row.corrects_id, sent_by_id: sentBy };
}
