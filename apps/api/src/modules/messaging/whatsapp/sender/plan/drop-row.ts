import type { SenderRepo, DueMessage } from '@/modules/messaging/whatsapp/sender/sender.repo';
import { dropReason } from '@/modules/messaging/whatsapp/sender/send-stale';

/**
 * Drops a row that must not go out any more (dropReason, a staff alert read with its teacher as
 * on record now): written failed, its code returned. null = it may go.
 */
export async function dropRow(
  queries: Pick<SenderRepo, 'staffAtSend' | 'expire'>,
  row: DueMessage,
  now: Date,
): Promise<'expired' | 'stale' | null> {
  const staff = await queries.staffAtSend(row);
  const drop = dropReason(staff ? { ...row, staff } : row, now);
  if (!drop) return null;
  await queries.expire(row.id, drop);
  return drop.code;
}
