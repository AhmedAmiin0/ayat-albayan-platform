import type { MessageView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MouseEvent } from 'react';
import { Button, buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { errorCode } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { handOffMessage, markSentManually, retryMessage } from '@/features/messaging/inbox/api/api';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';
import { rereadSentChat, showAnswer } from '@/features/messaging/inbox/api/send-cache';
import { canRetry, canSendByHand, isHandedOff } from '@/features/messaging/inbox/messages/lib/message-notes';

/** WhatsApp opens only once the server holds the row, so it is never sent twice (R-MSG-03). */
export function MessageActions({ message: m }: { message: MessageView }) {
  const queryClient = useQueryClient();
  const answered = (row: MessageView) => {
    showAnswer(queryClient, row);
    return refreshAnchored(queryClient, m.phone_e164);
  };
  // A refused hand-off: the sender claimed the row meanwhile, so the chat reads its real state.
  const refused = () =>
    Promise.all([
      rereadSentChat(queryClient, m.phone_e164),
      refreshAnchored(queryClient, m.phone_e164),
    ]);
  const retry = useMutation({ mutationFn: retryMessage, onSuccess: answered });
  const handOff = useMutation({
    mutationFn: handOffMessage,
    onSuccess: answered,
    onError: refused,
  });
  const manual = useMutation({ mutationFn: markSentManually, onSuccess: answered });
  const asking = isHandedOff(m);
  const busy = retry.isPending || manual.isPending;
  const sending = errorCode(handOff.error) === 'not_manual';
  const sendByHand = (e: MouseEvent<HTMLAnchorElement>) => {
    if (asking || !m.click_to_chat) return; // already held: the link just opens WhatsApp again
    e.preventDefault();
    const link = m.click_to_chat;
    // Opened now, inside the click: a tab opened after the request would be popup-blocked.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    void handOff.mutateAsync(m.id).then(
      () => (tab ? tab.location.replace(link) : window.open(link, '_blank', 'noreferrer')),
      () => tab?.close(),
    );
  };

  return (
    <div className="mt-2 grid gap-2 border-t border-rule pt-2">
      <div className="flex flex-wrap items-center gap-2">
        {canRetry(m) && (
          <Button size="sm" variant="secondary" disabled={retry.isPending} onClick={() => retry.mutate(m.id)}>
            {retry.isPending ? t.messages.retrying : t.messages.retry}
          </Button>
        )}
        {canSendByHand(m) && m.click_to_chat && (
          <a
            href={m.click_to_chat}
            target="_blank"
            rel="noreferrer"
            onClick={sendByHand}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {t.messages.clickToChat}
          </a>
        )}
      </div>
      {asking && (
        <div role="group" aria-label={t.messages.markSentManually} className="grid gap-2 text-xs text-ink-2">
          <span>{t.messages.handedOff}</span>
          <span className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => manual.mutate(m.id)}>
              {t.messages.markSentManually}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => retry.mutate(m.id)}>
              {t.messages.undoHandOff}
            </Button>
          </span>
        </div>
      )}
      {retry.isSuccess && !asking && <p className="text-2xs text-ink-2">{t.messages.retryQueued}</p>}
      {(retry.isError || manual.isError || handOff.isError) && (
        <p role="alert" className="text-2xs text-danger">
          {sending ? t.messages.alreadySending : t.common.error}
        </p>
      )}
    </div>
  );
}
