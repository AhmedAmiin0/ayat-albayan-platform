import { replyNeedsInput, resolveSavedReply, type SavedReply, type SavedReplyValues, type ThreadView } from '@ab/shared';
import { useMyProfile } from '@/account/hooks/queries';
import type { ReplyFill } from '../use-saved-reply';

export interface ReplyContact {
  thread: ThreadView | null;
  /** The family's first student: a saved reply's {student}. */
  student?: string | null | undefined;
}

/**
 * A pick with its placeholders filled: {name} the chat's display name (guardian / lead), {student}
 * the family's first student, {assistant} the signed-in person's name. A reply with a «[blank]», or
 * a placeholder whose value is unknown, opens the «أكمل الرد» form first (owner 2026-10-27; `known`
 * prefills it); any other fills the box at once, as before. Mounted only while a list is open (the
 * profile is read then).
 */
export function useFillReply(contact: ReplyContact, onFill: ReplyFill) {
  const me = useMyProfile().data;
  const known: SavedReplyValues = { name: contact.thread?.display_name, student: contact.student, assistant: me?.full_name ?? null };
  const pick = (reply: SavedReply) => {
    if (replyNeedsInput(reply.body, known)) onFill.ask(reply);
    else onFill(resolveSavedReply(reply.body, known), reply);
  };
  return { pick, known };
}
