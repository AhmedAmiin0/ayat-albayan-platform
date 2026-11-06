import type { TablesUpdate } from '@ab/db';
import type { MessageStatus } from '@ab/shared';
import type { StatusEvent } from '../webhook.events';

// R-MSG-05: Meta delivery statuses move an outbound row forward only. Webhooks arrive out of
// order and are retried, so «delivered» after «read» or a repeated «sent» changes nothing.

const RANK: Partial<Record<MessageStatus, number>> = { queued: 0, sent: 1, delivered: 2, read: 3 };

/** forward along queued < sent < delivered < read; failed from anything but read. */
function forward(current: MessageStatus, incoming: StatusEvent['status']): MessageStatus | null {
  const from = RANK[current];
  if (from === undefined) return null;
  if (incoming === 'failed') return current === 'read' ? null : 'failed';
  const to = RANK[incoming] ?? -1;
  return to > from ? incoming : null;
}

/**
 * «أرسل عبر واتساب» (owner 2026-11-06): a sent_manually row WhatsApp's echo was attached to (it has
 * a wamid) takes the app message's delivered / read; never failed, and never one with no wamid.
 */
const MANUAL_NEXT: Partial<Record<StatusEvent['status'], MessageStatus>> = {
  delivered: 'delivered',
  read: 'read',
};

const manualNext = (incoming: StatusEvent['status'], attached: boolean): MessageStatus | null =>
  attached ? (MANUAL_NEXT[incoming] ?? null) : null;

/**
 * The status the row should take, or null for no change: forward along queued < sent <
 * delivered < read; failed from anything but read. A failed row stays as it is; a sent_manually
 * row too, unless `attached` (it carries the WhatsApp Business app's wamid): delivered / read.
 */
export function nextStatus(
  current: MessageStatus,
  incoming: StatusEvent['status'],
  attached = false,
): MessageStatus | null {
  return current === 'sent_manually' ? manualNext(incoming, attached) : forward(current, incoming);
}

export interface StatusRow {
  status: MessageStatus;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  /** Set on a sent_manually row an app echo was attached to (it then moves on, nextStatus). */
  wa_message_id?: string | null;
}

/**
 * The messages patch for one status event, or null when nothing changes. A skipped step
 * («read» before «delivered») fills the earlier *_at with the same instant.
 */
export function statusPatch(row: StatusRow, e: StatusEvent): TablesUpdate<'messages'> | null {
  const to = nextStatus(row.status, e.status, Boolean(row.wa_message_id));
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
