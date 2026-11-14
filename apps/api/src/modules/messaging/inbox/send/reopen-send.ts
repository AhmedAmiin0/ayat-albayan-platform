import type { TemplateView, ThreadTemplate } from '@ab/shared';
import type { ReopenPick, ReopenStamp } from '@/modules/messaging/whatsapp';
import { messagingWindowOpen, type ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';

/** A thread template send that may be «إعادة فتح المحادثة» (owner 2026-11-14). */
interface ReopenAsk {
  phone: string;
  input: Pick<ThreadTemplate, 'reopen'>;
  template: Pick<TemplateView, 'line'>;
  thread: ThreadRow | null;
  now: Date;
}

/** Asked for, and the window is closed: an open window sends it as a plain template. */
const reopens = (a: ReopenAsk): boolean =>
  a.input.reopen === true && !(a.thread !== null && messagingWindowOpen(a.thread, a.now));

/**
 * The reopen stamp of a picked template (ReopenPick: the `reopen:` dedup key the window hold
 * reads, and its 24 h expiry), or null for a plain template send.
 */
export async function reopenStamp(
  pick: ReopenPick | undefined,
  ask: ReopenAsk,
): Promise<ReopenStamp | null> {
  if (!pick || !reopens(ask)) return null;
  return pick.stamp({ phone: ask.phone, line: ask.template.line, now: ask.now });
}
