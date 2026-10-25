import type { MessageView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MouseEvent } from 'react';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { errorCode } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import { handOffMessage, markSentManually, retryMessage } from './api';
import { canRetry, canSendByHand, isHandedOff } from './message-notes';

/**
 * A send that didn't go out (R-MSG-03/05): «جرّب تاني» puts a failed row back in the queue (M1);
 * «ابعتها بنفسك من واتساب» opens wa.me with the text prefilled and tells the server (M3), which
 * holds the row so the sender never sends it too. The question «بعتّها؟» then comes from the row
 * itself, so it survives a refresh: yes records the manual send (M2), no puts it back (M1).
 * WhatsApp opens only once the server holds the row: if the sender claimed it meanwhile (409
 * not_manual) the admin is told it is going out, so the family never gets it twice.
 */
export function MessageActions({ message: m }: { message: MessageView }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['threads'] });
  const retry = useMutation({ mutationFn: retryMessage, onSuccess: refresh });
  const handOff = useMutation({ mutationFn: handOffMessage, onSettled: refresh });
  const manual = useMutation({ mutationFn: markSentManually, onSuccess: refresh });
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
