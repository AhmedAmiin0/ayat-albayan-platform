import { isUnavailableMessage, type MessageView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { useChatActions } from '../../thread/hooks/chat-actions';
import { ResendSheet } from './ResendSheet';

/**
 * Under Meta's 131060 bubble (a new number's first message whose content never reached us): «اطلب
 * إعادة الإرسال». Only where she may write now: the admin and sales chats (never a teacher's, nor her
 * own read-only chat) inside the 24 h window (ChatActions.canSend); the API still decides the send.
 */
export function ResendAsk({ message, phone }: { message: MessageView; phone: string }) {
  const { enabled, canSend } = useChatActions();
  const [open, setOpen] = useState(false);
  if (!enabled || !canSend || message.direction !== 'inbound' || !isUnavailableMessage(message.interactive_payload)) return null;
  return (
    <>
      <Button variant="secondary" label={t.inbox.resend.action} onPress={() => setOpen(true)} />
      {open ? <ResendSheet phone={phone} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
