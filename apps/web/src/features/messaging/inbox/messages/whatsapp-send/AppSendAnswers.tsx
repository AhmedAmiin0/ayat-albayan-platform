import { APP_SEND_ANSWER_KEYS, type AppSendAnswer } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { markSentManually } from '@/features/messaging/inbox/api/api';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';
import { clearWhatsAppSend } from './use-whatsapp-send';

interface Props {
  message: MessageView;
  answers: readonly AppSendAnswer[];
}

/**
 * Staff's answer about a «أرسل عبر واتساب» (docs/19): «أرسلتها» while pending and «نعم، أرسلتها»
 * after an unconfirmed one record the manual send (POST sent-manually: the platform stops for
 * good). A row handed to WhatsApp is never put back to automatic sending (no retry answer). On
 * success the row's earlier tap error is cleared: it no longer describes the row.
 */
export function AppSendAnswers({ message: m, answers }: Props) {
  const client = useQueryClient();
  const refresh = () => {
    clearWhatsAppSend(client, m.id);
    return Promise.all([
      client.invalidateQueries({ queryKey: ['threads'] }),
      refreshAnchored(client, m.phone_e164),
    ]);
  };
  const sent = useMutation({ mutationFn: markSentManually, onSuccess: refresh });
  const answer = () => sent.mutate(m.id);
  return (
    <>
      {answers.map((a) => (
        <Button key={a} size="sm" variant="ghost" disabled={sent.isPending} onClick={answer}>
          {t.messages.whatsappSend[APP_SEND_ANSWER_KEYS[a]]}
        </Button>
      ))}
      {sent.isError && (
        <p role="alert" className="w-full text-danger">
          {t.common.error}
        </p>
      )}
    </>
  );
}
