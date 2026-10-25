import { canRetryCode, type MessageView } from '@ab/shared';
import { Linking, View } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { ErrorLine } from '../../ErrorLine';
import { useMessageAction } from '../../thread/hooks/use-thread';

/**
 * Under an outbound row that did not go out (R-MSG-03/05; why is MessageBubble's): «جرّب تاني» (failed
 * where trying again can help), «ابعتها بنفسك من واتساب» (the API's wa.me link with the text filled
 * in), which also tells the server: it holds the row so the sender never sends it too. The question
 * «بعتّها؟» then comes from the row itself (it survives closing the app): yes records the manual
 * send, no puts it back in the queue. WhatsApp opens only once the server holds the row: if the
 * sender claimed it meanwhile (409 not_manual), it says the message is going out instead.
 */
export function MessageActions({ message: m, phone }: { message: MessageView; phone: string }) {
  const retry = useMessageAction(phone, 'retry');
  const manual = useMessageAction(phone, 'sent-manually');
  const handOff = useMessageAction(phone, 'hand-off');
  const link = m.click_to_chat;
  const failed = m.status === 'failed';
  const asking = failed && m.error_code === 'handed_off';
  const e = handOff.error;
  const sending = e instanceof ApiError && (e.body as { code?: unknown } | null)?.code === 'not_manual';
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      {failed && canRetryCode(m.error_code) ? (
        <Button
          variant="secondary"
          label={retry.isPending ? t.messages.retrying : t.messages.retry}
          busy={retry.isPending}
          onPress={() => retry.mutate(m.id)}
        />
      ) : null}
      {link ? (
        <Button
          variant="ghost"
          label={t.messages.clickToChat}
          onPress={() => {
            if (asking) return void Linking.openURL(link); // already held
            handOff.mutate(m.id, { onSuccess: () => void Linking.openURL(link) });
          }}
        />
      ) : null}
      {asking ? (
        <InlineConfirm
          message={t.messages.handedOff}
          confirmLabel={t.messages.markSentManually}
          cancelLabel={t.messages.undoHandOff}
          busy={manual.isPending || retry.isPending}
          onCancel={() => retry.mutate(m.id)}
          onConfirm={() => manual.mutate(m.id)}
        />
      ) : null}
      {retry.isError || manual.isError || handOff.isError ? (
        <ErrorLine message={sending ? t.messages.alreadySending : t.common.error} />
      ) : null}
    </View>
  );
}
