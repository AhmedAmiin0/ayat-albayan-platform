import type { Db } from '@/common/db/db.module';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';
import { LANE_ROWS, laneOfRow, type Lane } from './lanes';

// #695 review, item 2: a template's enqueue stamp (send-line templateStamp) picks the lane its
// queued rows drain in. «نقل إلى الرقم الآخر» changes the template's line, so its rows still queued
// and not claimed take the new stamp: the chat lane never drains a notifications send under the
// notifications lock (behind a CRM batch), and the main lane leaves the chat line's sends alone.

/** `line`: the new stamp, templateStamp(template).line ?? null. */
export interface RelaneInput { key: string; line: 'chat' | null }

/** The lane the rows are leaving: the other one. */
const OTHER: Record<Lane, Lane> = { chat: 'main', main: 'chat' };
/** Never a row in flight (claimed, SENDING): its claim stamps the line it is sent on. */
const UNCLAIMED = `error_code.is.null,error_code.neq.${SENDING}`;

/** Compare-and-set on queued + unclaimed + the old lane; the number of rows moved. */
export async function relaneQueued(db: Db, input: RelaneInput): Promise<number> {
  const { data, error } = await db
    .from('messages')
    .update({ line: input.line })
    .eq('template_key', input.key)
    .eq('direction', 'outbound')
    .eq('status', 'queued')
    .or(UNCLAIMED)
    .or(LANE_ROWS[OTHER[laneOfRow(input)]])
    .or('line.is.null,line.neq.calls')
    .select('id');
  if (error) throw new Error(`queued rows lane write failed: ${error.message}`);
  return data.length;
}
