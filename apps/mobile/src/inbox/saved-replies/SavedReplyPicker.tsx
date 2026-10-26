import type { SavedReply } from '@ab/shared';
import { SavedRepliesSheet } from './SavedRepliesSheet';
import { type ReplyContact, useFillReply } from './quick-list/use-fill-reply';

interface SavedReplyPickerProps {
  contact: ReplyContact;
  onClose: () => void;
  /** The reply's text with its placeholders filled ({assistant} = the signed-in person's name). */
  onFill: (text: string, reply: SavedReply) => void;
}

/** The button's sheet plus the placeholder values; mounted only while open. */
export function SavedReplyPicker({ contact, onClose, onFill }: SavedReplyPickerProps) {
  const pick = useFillReply(contact, onFill);
  return <SavedRepliesSheet onClose={onClose} onPick={pick} />;
}
