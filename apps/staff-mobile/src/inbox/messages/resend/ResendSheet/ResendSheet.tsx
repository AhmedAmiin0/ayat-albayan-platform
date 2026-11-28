import ar from '@ab/shared/i18n/ar.json';
import { Modal, Pressable, View } from 'react-native';
import { t, shape, type, useTheme, AppText, Button, ErrorLine } from '@ab/mobile-kit';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { ButtonRow } from '@/core/ui/actions';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import { useSendMessage } from '@/inbox/thread/hooks/use-thread';
import { chatSendError } from '@/inbox/thread/send/send-error';

/** Always the Arabic text, whatever the UI language: it goes to the family. */
const RESEND_TEXT = ar.inbox.resend.text;

/** One clientRequestId per bubble, so double taps and retries send once. */
export function ResendSheet({ phone, id, onClose }: { phone: string; id: string; onClose: () => void }) {
  const { color } = useTheme();
  const { say } = useChatActions();
  const send = useSendMessage(phone);
  // The sheet stays while sending: closing could lose the answer of a send already on its way.
  const close = () => (send.isPending ? undefined : onClose());
  const confirm = () => {
    if (send.isPending || send.isSuccess) return;
    send.mutate(
      { out: { kind: 'text', text: RESEND_TEXT }, id },
      {
        onSuccess: () => {
          say({ text: t.inbox.resend.sent });
          onClose();
        },
      },
    );
  };
  const words = { fontFamily: type.ui[400], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.common.cancel} onPress={close} style={{ flex: 1, backgroundColor: color.scrim }} />
      <View testID="resend-sheet" style={{ gap: 12, padding: 16, paddingBottom: 32, backgroundColor: color.raised, borderTopStartRadius: shape.radius.lg, borderTopEndRadius: shape.radius.lg }}>
        <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}>
          {t.inbox.resend.title}
        </AppText>
        <AppText style={words}>{t.inbox.resend.hint}</AppText>
        <ContentText testID="resend-text" source={RESEND_TEXT} style={{ ...words, color: color.ink, padding: 12, borderRadius: shape.radius.md, backgroundColor: color.sunk }}>
          {RESEND_TEXT}
        </ContentText>
        {send.isError ? <ErrorLine message={chatSendError(send.error)} /> : null}
        <ButtonRow>
          <Button label={send.isPending ? t.inbox.resend.sending : t.inbox.resend.send} busy={send.isPending} onPress={confirm} />
          <Button variant="secondary" label={t.common.cancel} onPress={close} />
        </ButtonRow>
      </View>
    </Modal>
  );
}
