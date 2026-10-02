import type { Db } from '../../common/db/db.module';
import { reportIdOf } from './send-plan';

/**
 * The delivery side effects, for a send and for the admin's manual send (R-MSG-03): the lead's
 * last_outbound_at, and lesson_reports.sent_at for a report_ready row (id = dedup key suffix).
 */
export async function stampDelivered(db: Db, input: { leadId: string | null; dedupKey: string | null; at: string }): Promise<void> {
  if (input.leadId) {
    const { error } = await db.from('leads').update({ last_outbound_at: input.at }).eq('id', input.leadId);
    if (error) throw new Error(`lead last_outbound_at failed: ${error.message}`);
  }
  const reportId = reportIdOf(input.dedupKey);
  if (!reportId) return;
  const { error } = await db.from('lesson_reports').update({ sent_at: input.at }).eq('id', reportId).is('sent_at', null);
  if (error) throw new Error(`report sent_at failed: ${error.message}`);
}
