import { APP_SEND_ANSWER_KEYS, type AppSendAnswer } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { markSentManually } from '@/features/messaging/inbox/api/api';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';
import { showAnswer } from '@/features/messaging/inbox/api/send-cache';
import { clearWhatsAppSend } from './use-whatsapp-send';

interface Props {
  message: MessageView;
  answers: readonly AppSendAnswer[];
}

/** Recording a manual send stops the platform for good; such a row is never put back (docs/19). */
export function AppSendAnswers({ message: m, answers }: Props) {
  const client = useQueryClient();
  const refresh = (row: MessageView) => {
    clearWhatsAppSend(client, m.id);
    showAnswer(client, row);
    return refreshAnchored(client, m.phone_e164);
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
