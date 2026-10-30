import { messageTime } from '@/modules/messaging/webhook/external/external-message';
import type { Receiving } from '@/modules/messaging/webhook/lines/webhook.lines';
import { field, get, toInbound } from '@/modules/messaging/webhook/parse/webhook.parse';
import { MEDIA_TYPES, type InboundEvent } from '@/modules/messaging/webhook/webhook.events';

// A family's message read back from Kapso's history (docs/19) as the webhook's own InboundEvent.
// A history item is Meta's message object plus a `kapso` block, so it goes through the webhook's
// parser (toInbound) after three small fixes: the time as Meta's unix seconds (Kapso may send ISO),
// `from` from kapso.phone_number when the item names the family only by a business-scoped
// from_user_id, and a media part's mime from kapso.media_data when Meta's is missing. Pure.

/** Never more than a week back: older gaps are out of scope (and Meta's media ids age out). */
export const MAX_BACK_MS = 7 * 86_400_000;
/** Always re-read the last day: the webhook may come back (newer rows) before the gap is read. */
export const LOOKBACK_MS = 24 * 3_600_000;
/** Older than this when stored = the webhook did not deliver it: no live push, the admin alert. */
export const LATE_MS = 15 * 60_000;

/**
 * From the newest inbound row of the number, or the last day when that is newer; never more than a
 * week back. The first run after a deploy (`full`) reads the whole week: a gap that ended before
 * the deploy (the webhook recreated, newer rows already in) is still found.
 */
export function inboundSince(newest: Date | null, opts: { now: Date; full: boolean }): Date {
  const floor = new Date(opts.now.getTime() - MAX_BACK_MS);
  if (!newest || opts.full) return floor;
  const back = new Date(opts.now.getTime() - LOOKBACK_MS);
  const from = newest < back ? newest : back;
  return from < floor ? floor : from;
}

export const isLate = (at: Date, now: Date): boolean => now.getTime() - at.getTime() > LATE_MS;

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object';

/** The family's wa_id (digits, no +): Meta's `from`, else Kapso's phone_number of the chat. */
const senderOf = (m: unknown): string | null =>
  (field(m, 'from') ?? field(m, 'kapso.phone_number'))?.replace(/^\+/, '') || null;

/** A media part without Meta's mime_type takes Kapso's media_data.content_type. */
function mediaPart(m: Record<string, unknown>, type: string): Record<string, unknown> {
  const part = get(m, type);
  const mime = field(m, 'kapso.media_data.content_type');
  const media = (MEDIA_TYPES as readonly string[]).includes(type);
  if (!media || !isObject(part) || !mime || field(part, 'mime_type')) return {};
  return { [type]: { ...part, mime_type: mime } };
}

/** An inbound history item → the webhook's event; null for anything else or an unreadable one. */
export function historyInbound(m: unknown, at: Receiving): InboundEvent | null {
  if (!isObject(m) || field(m, 'kapso.direction') !== 'inbound') return null;
  const time = messageTime(field(m, 'timestamp'));
  const from = senderOf(m);
  if (!time || !from) return null;
  const timestamp = String(Math.floor(time.getTime() / 1000));
  const meta = { ...m, from, timestamp, ...mediaPart(m, field(m, 'type') ?? '') };
  return toInbound(meta, { names: new Map(), now: time, at });
}
