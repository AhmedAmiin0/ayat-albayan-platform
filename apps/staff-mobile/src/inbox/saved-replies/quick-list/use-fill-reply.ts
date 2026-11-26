import { replyNeedsInput, resolveSavedReply, type SavedReply, type SavedReplyValues, type ThreadView } from '@ab/shared';
import { useMyProfile } from '@ab/mobile-kit';
import type { ReplyFill } from '@/inbox/saved-replies/hooks/use-saved-reply';

export interface ReplyContact {
  thread: ThreadView | null;
  /** The family's first student: a saved reply's {student}. */
  student?: string | null | undefined;
}

/** An unknown placeholder or a blank opens the fill form first. */
export function useFillReply(contact: ReplyContact, onFill: ReplyFill) {
  const me = useMyProfile().data;
  const known: SavedReplyValues = {
    name: contact.thread?.display_name,
    student: contact.student,
    assistant: me?.full_name ?? null,
  };
  const pick = (reply: SavedReply) => {
    if (replyNeedsInput(reply.body, known)) onFill.ask(reply);
    else onFill(resolveSavedReply(reply.body, known), reply);
  };
  return { pick, known };
}
