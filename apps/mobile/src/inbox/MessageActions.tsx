import { canRetryCode, type MessageView } from '@ab/shared';
import { Linking, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { InlineConfirm } from '@/ui/InlineConfirm';
import { ErrorLine } from './ErrorLine';
import { errorLine } from './message-text';
import { useMessageAction } from './use-thread';

/**
 * Under an outbound row that did not go out (R-MSG-03/05): why it failed and «جرّب تاني» (failed
 * where trying again can help), «ابعتها بنفسك من واتساب» (the API's wa.me link with the text filled
 * in), which also tells the server: it holds the row so the sender never sends it too. The question
 * «بعتّها؟» then comes from the row itself (it survives closing the app): yes records the manual
 * send, no puts it back in the queue.
 */
export function MessageActions({ message: m, phone }: { message: MessageView; phone: string }) {
  const { color } = useTheme();
  const retry = useMessageAction(phone, 'retry');
  const manual = useMessageAction(phone, 'sent-manually');
  const handOff = useMessageAction(phone, 'hand-off');
  const link = m.click_to_chat;
  const failed = m.status === 'failed';
  const asking = failed && m.error_code === 'handed_off';
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      {failed && !asking ? (
        <AppText
          style={{
            fontFamily: type.ui[500],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs),
            color: color.bad,
          }}
        >
          {errorLine(m)}
        </AppText>
      ) : null}
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
            void Linking.openURL(link);
            if (!asking) handOff.mutate(m.id);
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
      {retry.isError || manual.isError || handOff.isError ? <ErrorLine message={t.common.error} /> : null}
    </View>
  );
}
