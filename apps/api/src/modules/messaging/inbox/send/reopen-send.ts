import type { TemplateView, ThreadTemplate } from '@ab/shared';
import type { ReopenPick, ReopenStamp } from '@/modules/messaging/whatsapp';
import { messagingWindowOpen, type ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';

/** A thread template send that may be «إعادة فتح المحادثة» (owner 2026-11-14). */
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

/**
 * The reopen stamp of a template sent into a closed window (ReopenPick: the `reopen:` dedup key
 * the window hold reads, and its 24 h expiry), or null for a plain template send. Picked
 * («إعادة فتح المحادثة»): its refusals reach the caller. A chat-line template sent the plain way
 * (review of #727, M3) takes the key too, so a held text never queues a second template; when
 * none can be had (one live, tries used), it goes as a plain template, as before.
 */
export async function reopenStamp(
  pick: ReopenPick | undefined,
  ask: ReopenAsk,
): Promise<ReopenStamp | null> {
  if (!pick || !closed(ask)) return null;
  if (ask.input.reopen === true) return stampOf(pick, ask);
  return reopensAnyway(ask) ? stampOf(pick, ask).catch(() => null) : null;
}
