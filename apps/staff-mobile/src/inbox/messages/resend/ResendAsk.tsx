import { isUnavailableMessage, type MessageView } from '@ab/shared';
import { useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { t, Button } from '@ab/mobile-kit';
import { useBubbleChatActions } from '@/inbox/thread/hooks/chat-actions';
import { ResendSheet } from './ResendSheet';

/** Meta 131060: only where she may write now, never a teacher's or read-only chat. */
export function ResendAsk({ message, phone }: { message: MessageView; phone: string }) {
  const { enabled, canSend } = useBubbleChatActions();
  const [open, setOpen] = useState(false);
  // One request per 131060 bubble, not per opening: the text goes to the family once.
  const [id] = useState(requestId);
  if (!enabled || !canSend || message.direction !== 'inbound' || !isUnavailableMessage(message.interactive_payload)) return null;
  return (
    <>
      <Button variant="secondary" label={t.inbox.resend.action} onPress={() => setOpen(true)} />
      {open ? <ResendSheet phone={phone} id={id} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
