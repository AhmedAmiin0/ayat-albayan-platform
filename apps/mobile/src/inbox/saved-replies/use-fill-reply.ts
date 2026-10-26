import { resolveSavedReply, type SavedReply, type ThreadView } from '@ab/shared';
import { useMyProfile } from '@/account/hooks/queries';

export interface ReplyContact {
  thread: ThreadView | null;
  /** The family's first student: a saved reply's {student}. */
  student?: string | null | undefined;
}

/**
 * A pick with its placeholders filled: {name} the chat's display name (guardian / lead), {student}
 * the family's first student, {assistant} the signed-in person's name. Mounted only while a list
 * is open (the profile is read then).
 */
export function useFillReply(contact: ReplyContact, onFill: (text: string, reply: SavedReply) => void) {
  const me = useMyProfile().data;
  return (reply: SavedReply) => {
    const values = { name: contact.thread?.display_name, student: contact.student, assistant: me?.full_name ?? null };
    onFill(resolveSavedReply(reply.body, values), reply);
  };
}
