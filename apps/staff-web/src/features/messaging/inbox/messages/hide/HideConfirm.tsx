import type { MessageView } from '@ab/shared';
import { ConfirmSwitchDialog } from '@/components/settings/dialogs/ConfirmSwitchDialog';
import { t } from '@/lib/i18n/i18n';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import { useHide } from './use-hide';

interface Props {
  message: MessageView;
  open: boolean;
  onClose: () => void;
}

const h = t.inbox.hide;

/**
 * «حذف من المنصة» asked from a bubble's menu: the confirm says plainly that it is hidden for staff
 * only and still on the customer's phone; nothing goes to WhatsApp.
 */
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
