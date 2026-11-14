import type { MessageStatus, ReopenSent, TemplateView } from '@ab/shared';

// «إعادة فتح المحادثة» (owner 2026-11-14, «like Kapso»): after the 24 h window the composer shows a
// bar. Staff pick an approved chat-line template and send it; the chat then waits for the family.

/**
 * The bar over the composer: none (the window is open), «reopen» (closed, no template live: the
 * button), «sent» (a reopen template is live: wait for the reply), or «none_allowed» (closed and
 * this user may send no template: the help line, no button).
 */
export type WindowBar = 'open' | 'reopen' | 'sent' | 'none_allowed';

export interface WindowBarInput {
  /** WhatsApp's 24 h window since the family's last message is open. */
  open: boolean;
  /** ThreadView.reopen_sent: a reopen template is live for this phone. */
  sent: boolean;
  /** This user may send no template here (no messages.read, or none allowed). */
  noneAllowed: boolean;
}

/** The first state that holds wins; none of them: the reopen button. */
export function windowBar(w: WindowBarInput): WindowBar {
  const order: readonly (readonly [boolean, WindowBar])[] = [
    [w.open, 'open'],
    [w.sent, 'sent'],
    [w.noneAllowed, 'none_allowed'],
  ];
  return order.find(([holds]) => holds)?.[1] ?? 'reopen';
}

/**
 * The reopen template's tick: its bubble's live status in the thread (the poll / socket moves it),
 * else what the thread page said when it loaded.
 */
export function reopenTick(
  sent: ReopenSent,
  messages: readonly { id: string; status: MessageStatus }[],
): MessageStatus {
  return messages.find((m) => m.id === sent.id)?.status ?? sent.status;
}

/** What the reopen picker offers, and which one it opens on. */
export interface ReopenChoices {
  /** The allowed templates that leave from the chat line (the one whose window is closed). */
  list: TemplateView[];
  /** The academy's `chat_reopen_template` when it is on the list; else the first; else null. */
  initial: TemplateView | null;
}

/** `allowed` = the templates this user may send in this chat (the composer's own list). */
export function reopenChoices(
  allowed: readonly TemplateView[],
  preferred: string | undefined,
): ReopenChoices {
  const list = allowed.filter((x) => x.line === 'chat');
  const initial = list.find((x) => x.key === preferred) ?? list[0] ?? null;
  return { list, initial };
}
