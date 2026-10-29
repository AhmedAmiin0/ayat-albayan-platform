import type { MessageView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { ErrorLine } from '../../ErrorLine';
import { useMessageAction } from '../../thread/hooks/use-thread';

/**
 * Under a row the admin handed to their own WhatsApp (R-MSG-03; retry and «أرسلها بنفسك» are in
 * FailedSheet, a tap on «! لم تُرسل»): the question «هل أرسلتها؟» comes from the row itself, so it
 * survives closing the app, and stays in the bubble as a pending answer. Yes records the manual
 * send, no puts it back in the queue.
 */
export function MessageActions({ message: m, phone }: { message: MessageView; phone: string }) {
  const retry = useMessageAction(phone, 'retry');
  const manual = useMessageAction(phone, 'sent-manually');
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      <InlineConfirm
        message={t.messages.handedOff}
        confirmLabel={t.messages.markSentManually}
        cancelLabel={t.messages.undoHandOff}
        busy={manual.isPending || retry.isPending}
        onCancel={() => retry.mutate(m.id)}
        onConfirm={() => manual.mutate(m.id)}
      />
      {retry.isError || manual.isError ? <ErrorLine message={t.common.error} /> : null}
    </View>
  );
}
