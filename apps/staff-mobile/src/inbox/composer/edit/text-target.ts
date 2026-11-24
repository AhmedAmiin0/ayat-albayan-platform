import { CORRECTION_PREFIX_ROOM, stripCorrectionPrefix, WA_TEXT_MAX, type MessageView } from '@ab/shared';
import { quoteOf } from '@/inbox/messages/hooks/quote-text';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import { correctionPrefixes, type Outgoing } from '@/inbox/thread/send/outgoing';

/** The box's text send. */
type TextOut = Extract<Outgoing, { kind: 'text' }>;

interface TextTargets {
  reply: MessageView | null;
  editing: MessageView | null;
}

/** A correction carries no reply or prefix: the API adds both. */
export function textOut(text: string, to: TextTargets): TextOut {
  if (to.editing) return { kind: 'text', text, correctsId: to.editing.id };
  return to.reply ? { kind: 'text', text, replyTo: quoteOf(to.reply) } : { kind: 'text', text };
}

/** What the box's clientRequestId is minted for besides the text: another target, another id. */
export const targetKey = (out: TextOut): string | undefined =>
  out.correctsId ? `correct:${out.correctsId}` : out.replyTo?.id;

/** In edit mode a box holding only the correction prefix is empty (API empty_correction). */
export const bareText = (text: string, editing: MessageView | null): boolean =>
  !stripCorrectionPrefix(editing ? correctionPrefixes() : [], text);

/** In edit mode it leaves room for the API's correction prefix, as threadTextSchema does. */
export const textMax = (editing: MessageView | null): number =>
  WA_TEXT_MAX - (editing ? CORRECTION_PREFIX_ROOM : 0);

/** An edit session ends only from its own tap, never a newer one (#694 follow-up item 4). */
export function useTextTarget() {
  const { reply, setReply, editing, editSession, editSent } = useChatActions();
  const sent = (out: TextOut, session: string | null) => {
    const answered = out.replyTo?.id;
    setReply((now) => (now !== null && now.id === answered ? null : now));
    if (out.correctsId && session) editSent(session);
  };
  const out = (text: string) => textOut(text, { reply, editing });
  const bare = (text: string) => bareText(text, editing);
  // Nothing to send, or no room left for the API's prefix (round 4 of #694).
  const blocked = (text: string) => bare(text) || text.length > textMax(editing);
  return { out, session: editSession, sent, bare, blocked };
}
