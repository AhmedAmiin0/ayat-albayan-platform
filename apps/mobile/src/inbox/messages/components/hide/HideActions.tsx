import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { Button } from '@/core/ui/primitives/Button';
import type { BubbleOffers } from '@/inbox/messages/hooks/bubble-offers';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import { Note } from '@/more';
import { useHideMessage } from './use-hide-message';

interface HideActionsProps {
  message: MessageView;
  offers: BubbleOffers;
  phone: string;
  onClose: () => void;
}

/**
 * The long-press menu's «حذف من المنصة» (admin, sales) with a confirm that says plainly the message
 * stays on the customer's phone, «إظهار» on a hidden one (the admin), and why there is no «تعديل»
 * for a WhatsApp message (only the WhatsApp Business app can edit it).
 */
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
