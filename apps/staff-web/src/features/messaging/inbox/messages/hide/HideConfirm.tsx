import type { MessageView } from '@ab/shared';
import { ConfirmSwitchDialog, t } from '@ab/web-kit';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import { useHide } from './use-hide';

interface Props {
  message: MessageView;
  open: boolean;
  onClose: () => void;
}

const h = t.inbox.hide;

/** Hidden for staff only; it stays on the customer's phone and nothing goes to WhatsApp. */
export function HideConfirm({ message, open, onClose }: Props) {
  const calls = useHide(useChatActions().chat.phone);
  if (!open) return null;
  return (
    <ConfirmSwitchDialog
      title={h.title}
      description={h.body}
      yes={h.confirm}
      onYes={() => calls.hide.mutate(message.id, { onSettled: onClose })}
      onClose={onClose}
      pending={calls.hide.isPending}
      failed={false}
    />
  );
}
