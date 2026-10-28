import ar from '@ab/shared/i18n/ar.json';
import { Modal, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { Button } from '@/core/ui/primitives/Button';
import { ButtonRow } from '@/core/ui/actions';
import { ErrorLine } from '../../ErrorLine';
import { useChatActions } from '../../thread/hooks/chat-actions';
import { useSendMessage } from '../../thread/hooks/use-thread';
import { sendError } from '../hooks/message-text';

/** What goes to the family: always the Arabic text, whatever the UI language (parent-facing output). */
const RESEND_TEXT = ar.inbox.resend.text;

/**
 * «اطلب إعادة الإرسال» confirmed (owner 2026-10-27): the exact text, then «أرسل» through the chat's
 * normal text send. The clientRequestId is the bubble's (ResendAsk), the same for every opening, and
 * no second tap while it goes: a double tap, a retry after a lost answer or asking again sends it
 * once (the API answers a known id with the first row). The composer's own text is never touched.
 */
export function ResendSheet({ phone, id, onClose }: { phone: string; id: string; onClose: () => void }) {
  const { color } = useTheme();
  const { say } = useChatActions();
  const send = useSendMessage(phone);
  // While it goes, the sheet stays: closing then could lose the answer of a send already on its way.
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
        {send.isError ? <ErrorLine message={sendError(send.error)} /> : null}
        <ButtonRow>
          <Button label={send.isPending ? t.inbox.resend.sending : t.inbox.resend.send} busy={send.isPending} onPress={confirm} />
          <Button variant="secondary" label={t.common.cancel} onPress={close} />
        </ButtonRow>
      </View>
    </Modal>
  );
}
