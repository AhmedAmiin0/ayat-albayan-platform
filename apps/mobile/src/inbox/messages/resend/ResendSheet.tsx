import ar from '@ab/shared/i18n/ar.json';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { requestId } from '@/core/lib/http/request-id';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '../../ErrorLine';
import { useChatActions } from '../../thread/hooks/chat-actions';
import { useSendMessage } from '../../thread/hooks/use-thread';
import { sendError } from '../hooks/message-text';

/** What goes to the family: always the Arabic text, whatever the UI language (parent-facing output). */
const RESEND_TEXT = ar.inbox.resend.text;

/**
 * «اطلب إعادة الإرسال» confirmed (owner 2026-10-27): the exact text, then «أرسل» through the chat's
 * normal text send. One clientRequestId per opened sheet and no second tap while it goes, so a double
 * tap or a retry after a lost answer sends it once. The composer's own text is never touched.
 */
export function ResendSheet({ phone, onClose }: { phone: string; onClose: () => void }) {
  const { color } = useTheme();
  const { say } = useChatActions();
  const send = useSendMessage(phone);
  const [id] = useState(requestId);
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
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.common.cancel} onPress={onClose} style={{ flex: 1, backgroundColor: color.scrim }} />
      <View testID="resend-sheet" style={{ gap: 12, padding: 16, paddingBottom: 32, backgroundColor: color.raised, borderTopStartRadius: shape.radius.lg, borderTopEndRadius: shape.radius.lg }}>
        <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}>
          {t.inbox.resend.title}
        </AppText>
        <AppText style={words}>{t.inbox.resend.hint}</AppText>
        <AppText testID="resend-text" style={{ ...words, color: color.ink, padding: 12, borderRadius: shape.radius.md, backgroundColor: color.sunk, writingDirection: 'rtl' }}>
          {RESEND_TEXT}
        </AppText>
        {send.isError ? <ErrorLine message={sendError(send.error)} /> : null}
        <Button label={send.isPending ? t.inbox.resend.sending : t.inbox.resend.send} busy={send.isPending} onPress={confirm} />
        <Button variant="ghost" label={t.common.cancel} onPress={onClose} />
      </View>
    </Modal>
  );
}
