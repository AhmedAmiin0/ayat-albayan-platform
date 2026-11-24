import type { TemplateView, ThreadTemplate } from '@ab/shared';
import type { ReopenPick, ReopenStamp } from '@/modules/messaging/whatsapp';
import { messagingWindowOpen, type ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';

interface ReopenAsk {
  phone: string;
  actorId: string;
  input: Pick<ThreadTemplate, 'reopen' | 'key'>;
  template: Pick<TemplateView, 'line'>;
  thread: ThreadRow | null;
  now: Date;
}

/** The window is closed: an open window sends any template as a plain one. */
const closed = (a: ReopenAsk): boolean =>
  !(a.thread !== null && messagingWindowOpen(a.thread, a.now));

/** Not asked for, but a chat-line template into a closed window: it reopens it all the same. */
const reopensAnyway = (a: ReopenAsk): boolean => a.template.line === 'chat';

const stampOf = (pick: ReopenPick, ask: ReopenAsk): Promise<ReopenStamp> => {
  const by = { actorId: ask.actorId, key: ask.input.key };
  return pick.stamp({ phone: ask.phone, line: ask.template.line, now: ask.now, by });
};

/** The reopen dedup key with its 24 h expiry, or null for a plain template send. */
export async function reopenStamp(
  pick: ReopenPick | undefined,
  ask: ReopenAsk,
): Promise<ReopenStamp | null> {
  if (!pick || !closed(ask)) return null;
  if (ask.input.reopen === true) return stampOf(pick, ask);
  return reopensAnyway(ask) ? stampOf(pick, ask).catch(() => null) : null;
}
