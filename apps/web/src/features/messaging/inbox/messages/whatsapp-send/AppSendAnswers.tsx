import {
  APP_SEND_ANSWER_ACTIONS,
  APP_SEND_ANSWER_KEYS,
  type AppSendAnswer,
} from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { markSentManually, retryMessage } from '@/features/messaging/inbox/api/api';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';

interface Props {
  message: MessageView;
  answers: readonly AppSendAnswer[];
}

/**
 * Staff's answer about a «أرسل عبر واتساب» (docs/19): «أرسلتها» while pending and «نعم» after an
 * unconfirmed one record the manual send (POST sent-manually: the platform stops for good); «لا،
 * أعدها للانتظار» is the retry, which holds a window-stopped text again (never free text).
 */
export function AppSendAnswers({ message: m, answers }: Props) {
  const client = useQueryClient();
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['threads'] }),
      refreshAnchored(client, m.phone_e164),
    ]);
  const sent = useMutation({ mutationFn: markSentManually, onSuccess: refresh });
  const hold = useMutation({ mutationFn: retryMessage, onSuccess: refresh });
  const actions = { 'sent-manually': sent, retry: hold };
  const run = (a: AppSendAnswer) => actions[APP_SEND_ANSWER_ACTIONS[a]].mutate(m.id);
  const busy = sent.isPending || hold.isPending;
  return (
    <>
      {answers.map((a) => (
        <Button key={a} size="sm" variant="ghost" disabled={busy} onClick={() => run(a)}>
          {t.messages.whatsappSend[APP_SEND_ANSWER_KEYS[a]]}
        </Button>
      ))}
      {(sent.isError || hold.isError) && (
        <p role="alert" className="w-full text-danger">
          {t.common.error}
        </p>
      )}
    </>
  );
}
