import type { MessageView } from '@ab/shared';
import { t, Button } from '@ab/mobile-kit';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';

interface CorrectActionProps {
  message: MessageView;
  onClose: () => void;
}

/**
 * «تعديل» in the long-press menu (owner 2026-11-07): WhatsApp cannot edit a sent message, so the
 * box takes its text for a correction (a new reply to it). Off, as «رد», while no text can go out.
 */
export function CorrectAction({ message, onClose }: CorrectActionProps) {
  const { canSend, startEdit } = useChatActions();
  return (
    <Button
      variant="secondary"
      label={t.inbox.correction.action}
      disabled={!canSend}
      onPress={() => {
        startEdit(message);
        onClose();
      }}
    />
  );
}
