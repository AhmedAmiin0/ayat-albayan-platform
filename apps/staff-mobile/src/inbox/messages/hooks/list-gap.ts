import type { MessageView } from '@ab/shared';

/**
 * Space over a message in the thread, WhatsApp-like: 4pt under one from the same side (a run of
 * theirs or ours reads as one block), 8pt where the side changes, none over the first.
 */
export function messageGap(
  prev: Pick<MessageView, 'direction'> | undefined,
  cur: Pick<MessageView, 'direction'>,
): number {
  if (!prev) return 0;
  return prev.direction === cur.direction ? 4 : 8;
}
