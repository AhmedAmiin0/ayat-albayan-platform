import type { MessageView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Button } from '@/core/ui/primitives/Button';
import { useMessageAction } from '@/inbox/thread/hooks/use-thread';
import { openWhatsApp } from './use-whatsapp-send';

/**
 * Marked sent from WhatsApp, but WhatsApp did not open: open it again, or «تراجع» puts the text
 * back in the queue (retry: sent_manually → queued, while the app's echo has not come back).
 */
export function WhatsAppOpenFailed({ message: m, phone }: { message: MessageView; phone: string }) {
  const undo = useMessageAction(phone, 'retry');
  return (
    <View style={{ gap: 6, marginTop: 4 }} testID="whatsapp-open-failed">
      <ErrorLine message={t.messages.whatsappSend.openFailed} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          variant="secondary"
          label={t.messages.whatsappSend.openAgain}
          onPress={() => void openWhatsApp(m).catch(() => undefined)}
        />
        <Button
          variant="secondary"
          label={t.messages.whatsappSend.undo}
          busy={undo.isPending}
          onPress={() => undo.mutate(m.id)}
        />
      </View>
      {undo.isError ? <ErrorLine message={t.messages.whatsappSend.undoFailed} /> : null}
    </View>
  );
}
