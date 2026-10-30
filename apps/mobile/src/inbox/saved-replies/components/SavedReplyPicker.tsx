import { SavedRepliesSheet } from './SavedRepliesSheet';
import { FillReplyForm } from '../quick-list/FillReplyForm';
import { type ReplyContact, useFillReply } from '../quick-list/use-fill-reply';
import type { ReplyFill } from '../hooks/use-saved-reply';

interface SavedReplyPickerProps {
  contact: ReplyContact;
  onClose: () => void;
  /** The reply's text with its placeholders filled ({assistant} = the signed-in person's name). */
  onFill: ReplyFill;
}

/**
 * The button's sheet plus the placeholder values; mounted only while open. A reply with blanks
 * (picked here or in the «/» list) shows its «أكمل الرد» form in place of the list: one sheet at a time.
 */
export function SavedReplyPicker({ contact, onClose, onFill }: SavedReplyPickerProps) {
  const { pick, known } = useFillReply(contact, onFill);
  const asking = onFill.asking;
  const form = asking ? <FillReplyForm key={asking.id} reply={asking} known={known} onInsert={(text) => onFill(text, asking)} onCancel={onClose} /> : null;
  return <SavedRepliesSheet onClose={onClose} onPick={pick} form={form} />;
}
