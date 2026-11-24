import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { t, Button } from '@ab/mobile-kit';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import type { BubbleOffers } from '@/inbox/messages/hooks/bubble-offers';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import { Note } from '@/more';
import { CorrectAction } from '@/inbox/messages/components/correction/CorrectAction';
import { useHideMessage } from './use-hide-message';

interface HideActionsProps {
  message: MessageView;
  offers: BubbleOffers;
  phone: string;
  onClose: () => void;
}

/** Hiding keeps the message on the customer's phone, and the confirm says so. */
export function HideActions({ message: m, offers, phone, onClose }: HideActionsProps) {
  const [asking, setAsking] = useState(false);
  const hide = useHideMessage(phone);
  const { say } = useChatActions();
  const run = (hidden: boolean) =>
    hide.mutate(
      { id: m.id, hide: hidden },
      { onSuccess: onClose, onError: () => say({ text: t.inbox.hide.failed }) },
    );
  return (
    <>
      {offers.correct ? <CorrectAction message={m} onClose={onClose} /> : null}
      {offers.noEdit ? <Note>{t.inbox.hide.noEdit}</Note> : null}
      {offers.hide && !asking ? (
        <Button variant="secondary" label={t.inbox.hide.action} onPress={() => setAsking(true)} />
      ) : null}
      {offers.hide && asking ? (
        <InlineConfirm
          message={`${t.inbox.hide.title} ${t.inbox.hide.body}`}
          confirmLabel={t.inbox.hide.confirm}
          tone="danger"
          busy={hide.isPending}
          onConfirm={() => run(true)}
          onCancel={() => setAsking(false)}
        />
      ) : null}
      {offers.unhide ? (
        <Button
          variant="secondary"
          label={t.inbox.hide.unhide}
          busy={hide.isPending}
          onPress={() => run(false)}
        />
      ) : null}
    </>
  );
}
