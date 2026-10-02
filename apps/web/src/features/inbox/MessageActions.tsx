import type { MessageView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { markSentManually, retryMessage } from './api';
import { canRetry, canSendByHand } from './message-notes';

/**
 * A send that didn't go out (R-MSG-03/05): «جرّب تاني» puts a failed row back in the queue (M1);
 * «ابعتها بنفسك من واتساب» opens wa.me with the text prefilled, then asks before recording that the
 * admin sent it by hand (M2), so the sender never sends it twice.
 */
export function MessageActions({ message: m }: { message: MessageView }) {
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['threads'] });
  const retry = useMutation({ mutationFn: retryMessage, onSuccess: refresh });
  const manual = useMutation({
    mutationFn: markSentManually,
    onSuccess: async () => {
      setAsking(false);
      await refresh();
    },
  });

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
            onClick={() => setAsking(true)}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {t.messages.clickToChat}
          </a>
        )}
      </div>
      {asking && (
        <div role="group" aria-label={t.messages.markSentManually} className="grid gap-2 text-xs text-ink-2">
          <span>{t.messages.sentManuallyConfirm}</span>
          <span className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={manual.isPending} onClick={() => manual.mutate(m.id)}>
              {t.messages.markSentManually}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
              {t.messages.cancelManual}
            </Button>
          </span>
        </div>
      )}
      {retry.isSuccess && <p className="text-2xs text-ink-2">{t.messages.retryQueued}</p>}
      {(retry.isError || manual.isError) && (
        <p role="alert" className="text-2xs text-danger">
          {t.common.error}
        </p>
      )}
    </div>
  );
}
