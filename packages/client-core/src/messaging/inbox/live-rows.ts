import {
  MESSAGE_DIRECTIONS,
  MESSAGE_STATUSES,
  type MessageStatus,
  type MessageView,
} from '@ab/shared';
import { z } from 'zod';
import { laterStatus, type TickRow } from '../ticks/index.js';
import { changedPhone } from './inbox-live.js';

// docs/44 P1-2 / K1 (migration 20261107000300): a 'thread_changed' event carries the rows its
// statement touched when every staff reader may see them — {phone, rows:[{id, s, d, at}]}, at most
// 20 — else {phone} alone. A client moves the tick of an outbound row its open chat holds with no
// request; any other row, a {phone}-only event or anything it cannot apply still re-reads.

/** Most rows one event carries (the trigger sends {phone} alone above it). */
export const LIVE_ROWS_MAX = 20;

const liveRowSchema = z.object({
  id: z.string().min(1),
  s: z.enum(MESSAGE_STATUSES),
  d: z.enum(MESSAGE_DIRECTIONS),
  at: z.string(),
});
const liveEventSchema = z.object({
  phone: z.string(),
  rows: z.array(liveRowSchema).min(1).max(LIVE_ROWS_MAX).optional(),
});

/** One row of an event: its id, status (s), direction (d) and created_at (at). */
export type LiveRow = z.infer<typeof liveRowSchema>;
/** A parsed event: the phone always, the rows when the server could tell them. */
export interface LiveEvent {
  phone: string;
  rows?: readonly LiveRow[];
}

/**
 * The event, or null for anything without a valid phone (it refreshes nothing). Rows that do not
 * parse are dropped, never guessed at: the event then re-reads like a {phone}-only one.
 */
export function liveEvent(payload: unknown): LiveEvent | null {
  const phone = changedPhone(payload);
  if (phone === null) return null;
  const parsed = liveEventSchema.safeParse(payload);
  return parsed.success && parsed.data.rows ? { phone, rows: parsed.data.rows } : { phone };
}

/** What an event does to a client's copies (applyLiveRows). */
export interface LivePatch {
  /** The incoming status of every row of the event, by id (patch held copies with laterStatus). */
  incoming: ReadonlyMap<string, MessageStatus>;
  /** Only tick moves of rows the open chat already shows: nothing is left to re-read over HTTP. */
  complete: boolean;
}

/**
 * A row an event can settle with no read: an outbound row's tick past queued. An inbound row (new,
 * unread: the read stamps it) or a queued one (a first insert, or a retry from failed) re-reads.
 */
const tickOnly = (r: LiveRow): boolean => r.d === 'outbound' && r.s !== 'queued';

/**
 * The rows of an event against the WATCHED CHAT (`statusOf`: its status, undefined for an id it
 * does not show; a list cache never counts). Complete only when there were rows and each is a tick
 * move of an outbound row that chat holds; otherwise the caller still applies `incoming` (every
 * cache moves the ticks it holds at once) and re-reads for the rest (the throttled read).
 */
export function applyLiveRows(
  rows: readonly LiveRow[] | undefined,
  statusOf: (id: string) => MessageStatus | undefined,
): LivePatch {
  const list = rows ?? [];
  const settled = (r: LiveRow) => tickOnly(r) && statusOf(r.id) !== undefined;
  const incoming = new Map(list.map((r) => [r.id, r.s]));
  return { incoming, complete: list.length > 0 && list.every(settled) };
}

/** `cached` moved by its incoming status (laterStatus: ✓✓ never goes back to ✓). */
const moved = (incoming: ReadonlyMap<string, MessageStatus>, id: string, cached: MessageStatus) => {
  const next = incoming.get(id);
  return next === undefined ? cached : laterStatus(cached, next);
};

/** One message with its incoming status; the same object when the tick does not move. */
function patchTick<M extends Pick<MessageView, 'id' | 'status'>>(
  m: M,
  incoming: ReadonlyMap<string, MessageStatus>,
): M {
  const status = moved(incoming, m.id, m.status);
  return status === m.status ? m : { ...m, status };
}

/** A chat cache ({ pages }) with the incoming ticks; the same object when none moves. */
export function patchChat<T extends { pages: { messages: MessageView[] }[] }>(
  data: T,
  incoming: ReadonlyMap<string, MessageStatus>,
): T {
  const pages = data.pages.map((p) => {
    const messages = p.messages.map((m) => patchTick(m, incoming));
    return messages.every((m, i) => m === p.messages[i]) ? p : { ...p, messages };
  });
  return pages.every((p, i) => p === data.pages[i]) ? data : { ...data, pages };
}

/** A chats-list page ({ items }) with the incoming ticks; the same object when none moves. */
export function patchList<P extends { items: TickRow[] }>(
  page: P,
  incoming: ReadonlyMap<string, MessageStatus>,
): P {
  const items = page.items.map((row) => {
    const status = moved(incoming, row.last_message_id, row.last_status);
    return status === row.last_status ? row : { ...row, last_status: status };
  });
  return items.every((r, i) => r === page.items[i]) ? page : { ...page, items };
}
