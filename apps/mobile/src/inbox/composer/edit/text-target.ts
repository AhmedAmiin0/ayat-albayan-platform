import type { MessageView } from '@ab/shared';
import { quoteOf } from '@/inbox/messages/hooks/quote-text';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import type { Outgoing } from '@/inbox/thread/send/outgoing';

/** The box's text send. */
export type TextOut = Extract<Outgoing, { kind: 'text' }>;

interface TextTargets {
  reply: MessageView | null;
  editing: MessageView | null;
}

/**
 * The box's text with what it answers («رد») or corrects («تعديل», owner 2026-11-07). A correction
 * carries no reply and no prefix: the API adds «تصحيح: » and the reply to the original.
 */
export function textOut(text: string, to: TextTargets): TextOut {
  if (to.editing) return { kind: 'text', text, correctsId: to.editing.id };
  return to.reply ? { kind: 'text', text, replyTo: quoteOf(to.reply) } : { kind: 'text', text };
}

/** What the box's clientRequestId is minted for besides the text: another target, another id. */
export const targetKey = (out: TextOut): string | undefined =>
  out.correctsId ? `correct:${out.correctsId}` : out.replyTo?.id;

/** The box's text target now, and its end once that text went (its reply or its edit mode). */
export function useTextTarget() {
  const { reply, setReply, editing, editSent } = useChatActions();
  const sent = (out: TextOut) => {
    const answered = out.replyTo?.id;
    setReply((now) => (now !== null && now.id === answered ? null : now));
    if (out.correctsId) editSent(out.correctsId);
  };
  return { out: (text: string) => textOut(text, { reply, editing }), sent };
}
