import type { TablesUpdate } from '@ab/db';
import { messageStatusSchema, type MessageStatus } from '@ab/catalog';
import { z } from 'zod';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';

// R-MSG-05: Meta delivery statuses move an outbound row forward only. Webhooks arrive out of
// order and are retried, so «delivered» after «read» or a repeated «sent» changes nothing.

/** A failed or manually sent row has no rank: it never moves. */
const RANK = z.record(messageStatusSchema, z.number().nullable()).readonly().decode({
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: null,
  sent_manually: null,
});

/**
 * The status the row should take, or null for no change: forward along queued < sent <
 * delivered < read; failed from anything but read. A failed or sent_manually row stays as it is.
 */
export function nextStatus(current: MessageStatus, incoming: StatusEvent['status']): MessageStatus | null {
  const from = RANK[current];
  if (from === null) return null;
  if (incoming === 'failed') return current === 'read' ? null : 'failed';
  const to = RANK[incoming] ?? -1;
  return to > from ? incoming : null;
}

export interface StatusRow {
  status: MessageStatus;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
}

/**
 * The messages patch for one status event, or null when nothing changes. A skipped step
 * («read» before «delivered») fills the earlier *_at with the same instant.
 */
export function statusPatch(row: StatusRow, e: StatusEvent): TablesUpdate<'messages'> | null {
  const to = nextStatus(row.status, e.status);
  if (!to) return null;
  const at = e.at.toISOString();
  const patch: TablesUpdate<'messages'> = { status: to };
  if (to === 'failed') {
    patch.error_code = e.errorCode ?? 'unknown';
    patch.error_text = e.errorText;
  } else {
    patch.sent_at = row.sent_at ?? at;
    if (to !== 'sent') patch.delivered_at = row.delivered_at ?? at;
    if (to === 'read') patch.read_at = at;
  }
  if (e.conversationId) patch.wa_conversation_id = e.conversationId;
  if (e.pricingCategory) patch.wa_pricing_category = e.pricingCategory;
  return patch;
}
