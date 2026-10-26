import { resolveSavedReply, type SavedReply, type ThreadView } from '@ab/shared';
import { useMyProfile } from '@/account/hooks/queries';
import { SavedRepliesSheet } from './SavedRepliesSheet';

export interface SavedReplyPickerProps {
  initialQuery: string;
  /** {name}: the chat's display name (guardian / lead); {student}: the family's first student. */
  contact: { thread: ThreadView | null; student?: string | null | undefined };
  onClose: () => void;
  /** The reply's text with its placeholders filled ({assistant} = the signed-in person's name). */
  onFill: (text: string, reply: SavedReply) => void;
}

/** The sheet plus the placeholder values; mounted only while open (the profile is read then). */
export function SavedReplyPicker({ initialQuery, contact, onClose, onFill }: SavedReplyPickerProps) {
  const me = useMyProfile().data;
  return (
    <SavedRepliesSheet
      initialQuery={initialQuery}
      onClose={onClose}
      onPick={(reply) => {
        const values = { name: contact.thread?.display_name, student: contact.student, assistant: me?.full_name ?? null };
        onFill(resolveSavedReply(reply.body, values), reply);
      }}
    />
  );
}
