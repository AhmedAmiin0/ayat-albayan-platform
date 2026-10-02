import type { MessageView } from '@ab/shared';
import { useState } from 'react';
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
 * only), «ابعتها بنفسك من واتساب» (the API's wa.me link with the text filled in), then the question
 * «بعتّها بنفسي» so the sender never sends it a second time.
 */
export function MessageActions({ message: m, phone }: { message: MessageView; phone: string }) {
  const { color } = useTheme();
  const retry = useMessageAction(phone, 'retry');
  const manual = useMessageAction(phone, 'sent-manually');
  const [asking, setAsking] = useState(false);
  const link = m.click_to_chat;
  const failed = m.status === 'failed';
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      {failed ? (
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
      {failed ? (
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
            setAsking(true);
          }}
        />
      ) : null}
      {asking ? (
        <InlineConfirm
          message={t.messages.sentManuallyConfirm}
          confirmLabel={t.messages.markSentManually}
          busy={manual.isPending}
          onCancel={() => setAsking(false)}
          onConfirm={() => manual.mutate(m.id, { onSuccess: () => setAsking(false) })}
        />
      ) : null}
      {retry.isError || manual.isError ? <ErrorLine message={t.common.error} /> : null}
    </View>
  );
}
