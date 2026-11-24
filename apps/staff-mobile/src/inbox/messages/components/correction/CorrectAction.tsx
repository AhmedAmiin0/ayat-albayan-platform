import type { MessageView } from '@ab/shared';
import { t, Button } from '@ab/mobile-kit';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';

interface CorrectActionProps {
  message: MessageView;
  onClose: () => void;
}

/** WhatsApp cannot edit a sent message, so the text goes as a new correction reply. */
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
