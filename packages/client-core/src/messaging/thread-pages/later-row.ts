import type { MessageView } from '@ab/shared';

// Two copies of one message (the POST's answer, a read, a poll): which one the chat keeps. Only
// queued < sent < delivered < read are ranked; failed and sent_manually (and any other status, or
// a full re-read) always replace, since the server moves rows back from them too (docs/43 43-1).
// TODO(P0-1): unify with the shared laterStatus once both land.

const RANK: Partial<Record<MessageView['status'], number>> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

/** The held copy only when it is further along the ranked path than the incoming one. */
export function laterRow(held: MessageView, incoming: MessageView): MessageView {
  const was = RANK[held.status] ?? -1;
  const now = RANK[incoming.status] ?? Number.POSITIVE_INFINITY;
  return was > now ? held : incoming;
}
