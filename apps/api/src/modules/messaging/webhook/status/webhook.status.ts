import type { TablesUpdate } from '@ab/db';
import type { MessageStatus } from '@ab/shared';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';

// R-MSG-05: Meta delivery statuses move an outbound row forward only. Webhooks arrive out of
// order and are retried, so «delivered» after «read» or a repeated «sent» changes nothing.

const RANK: Partial<Record<MessageStatus, number>> = { queued: 0, sent: 1, delivered: 2, read: 3 };

/**
 * The status the row should take, or null for no change: forward along queued < sent <
 * delivered < read; failed from anything but read. A failed or sent_manually row stays as it is.
 */
export function nextStatus(current: MessageStatus, incoming: StatusEvent['status']): MessageStatus | null {
  const from = RANK[current];
  if (from === undefined) return null;
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

type Patch = TablesUpdate<'messages'>;
type StepPatch = (row: StatusRow, e: StatusEvent, at: string) => Patch;

const sentPatch: StepPatch = (row, _e, at) => ({ sent_at: row.sent_at ?? at });
const deliveredPatch: StepPatch = (row, e, at) => ({
  ...sentPatch(row, e, at),
  delivered_at: row.delivered_at ?? at,
});

/** Per status reached, the columns it sets besides `status` (a failure keeps the times). */
const STEP_PATCH = {
  failed: (_row, e) => ({ error_code: e.errorCode ?? 'unknown', error_text: e.errorText }),
  sent: sentPatch,
  delivered: deliveredPatch,
  read: (row, e, at) => ({ ...deliveredPatch(row, e, at), read_at: at }),
} satisfies Record<StatusEvent['status'], StepPatch>;

/** Meta's conversation id and pricing category, when the event carries them. */
const waExtras = (e: StatusEvent): Patch => ({
  ...(e.conversationId ? { wa_conversation_id: e.conversationId } : {}),
  ...(e.pricingCategory ? { wa_pricing_category: e.pricingCategory } : {}),
});

/**
 * The messages patch for one status event, or null when nothing changes. A skipped step
 * («read» before «delivered») fills the earlier *_at with the same instant. The status a row
 * moves to (nextStatus) is always the event's own.
 */
export function statusPatch(row: StatusRow, e: StatusEvent): Patch | null {
  if (!nextStatus(row.status, e.status)) return null;
  const at = e.at.toISOString();
  return { status: e.status, ...STEP_PATCH[e.status](row, e, at), ...waExtras(e) };
}
