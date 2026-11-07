import type { MessageStatus, MessageView } from '@ab/shared';

// docs/43 43-1: one message id's status only moves forward along queued < sent < delivered < read
// (the order of the webhook's RANK). `failed` and `sent_manually` have no rank: the server moves
// failed/held → queued and failed → sent_manually on purpose, so an answer naming them always wins.

const RANK: Record<MessageStatus, number | null> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: null,
  sent_manually: null,
};

/** On the ranked path (queued < sent < delivered < read): not failed, not sent by hand. */
export const isRanked = (status: MessageStatus): boolean => RANK[status] !== null;

/** Both statuses are on the ranked path and `status` is further along it than `than`. */
export function ranksAbove(status: MessageStatus, than: MessageStatus): boolean {
  const a = RANK[status];
  const b = RANK[than];
  return a !== null && b !== null && a > b;
}

/**
 * The status to keep for the SAME message id when an answer brings `incoming` over `cached`: the
 * cached one only when it is further along the ranked path (an older answer never takes ✓✓ back
 * to ✓); otherwise the incoming one (failed, sent_manually, a retry back to queued).
 */
export function laterStatus(cached: MessageStatus, incoming: MessageStatus): MessageStatus {
  return ranksAbove(cached, incoming) ? cached : incoming;
}

/** `fresh` with the cached row's tick (and its stamps) when the cached one is further along. */
export function laterTick(cached: MessageView | undefined, fresh: MessageView): MessageView {
  if (!cached || !ranksAbove(cached.status, fresh.status)) return fresh;
  const { status, sent_at, delivered_at, read_at } = cached;
  return { ...fresh, status, sent_at, delivered_at, read_at };
}

/** A chat cache (TanStack's InfiniteData of thread pages): only the rows matter here. */
export interface ChatPages {
  pages: readonly { messages: readonly MessageView[] }[];
}

/**
 * A page read (the newest page poll) whose rows keep a cached tick that is further along (docs/43
 * AU12): the read may have started before a delta brought ✓✓. Everything else comes from `fresh`.
 */
export function laterTicks<P extends { messages: MessageView[] }>(
  cache: ChatPages | undefined,
  fresh: P,
): P {
  const rows = cache?.pages.flatMap((p) => p.messages.map((m) => [m.id, m] as const)) ?? [];
  const cached = new Map(rows);
  const messages = fresh.messages.map((m) => laterTick(cached.get(m.id), m));
  const same = messages.every((m, i) => m === fresh.messages[i]);
  return same ? fresh : { ...fresh, messages };
}
