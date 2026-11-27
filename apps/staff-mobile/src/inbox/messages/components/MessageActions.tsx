import type { MessageView } from '@ab/shared';
import { View } from 'react-native';
import { t, ErrorLine } from '@ab/mobile-kit';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { useMessageAction } from '@/inbox/thread/hooks/use-message-action';

/** R-MSG-03: the sent-it question comes from the row so it survives closing the app. */
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
