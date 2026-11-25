import { isUnavailableMessage, type MessageView } from '@ab/shared';
import { useState } from 'react';
import { Button, t } from '@ab/web-kit';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import { ResendDialog } from './ResendDialog';

/** Only where she may write, while the 24 h window is open; the API still decides the send. */
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
