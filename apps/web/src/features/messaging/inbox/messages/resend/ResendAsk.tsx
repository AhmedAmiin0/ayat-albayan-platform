import { isUnavailableMessage, type MessageView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { useChatActions } from '../../shared/chat-actions';
import { ResendDialog } from './ResendDialog';

/**
 * Under Meta's 131060 bubble (a new number's first message whose content never reached us): «اطلب
 * إعادة الإرسال». Only in a chat she may write in (admin, sales; never teacher mode) while the 24 h
 * window is open (ChatActions.replyBlocked); the API still decides the send.
 */
export function ResendAsk({ message }: { message: MessageView }) {
  const { enabled, replyBlocked, chat } = useChatActions();
  const [open, setOpen] = useState(false);
  // One request per 131060 bubble, not per opening: the text goes to the family once.
  const [clientRequestId] = useState(() => crypto.randomUUID());
  if (!enabled || replyBlocked || message.direction !== 'inbound' || !isUnavailableMessage(message.interactive_payload)) return null;
  return (
    <>
      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setOpen(true)}>
        {t.inbox.resend.action}
      </Button>
      {open && <ResendDialog phone={chat.phone} clientRequestId={clientRequestId} onClose={() => setOpen(false)} />}
    </>
  );
}
