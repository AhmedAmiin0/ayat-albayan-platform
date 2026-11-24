import { canRetryCode, canSendViaWhatsApp, type MessageView } from '@ab/shared';
import { Linking } from 'react-native';
import { ApiError, t, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import { MenuSheet } from '@/core/ui/feedback/MenuSheet';
import { useMessageAction } from '@/inbox/thread/hooks/use-thread';
import { errorLine } from '@/inbox/messages/hooks/message-text';
import { SheetAnswers } from '@/inbox/messages/resend/AppSendAnswers';
import { useWhatsAppSend } from '@/inbox/messages/resend/use-whatsapp-send';

interface FailedSheetProps {
  phone: string;
  /** Null hides the sheet. */
  message: MessageView | null;
  onClose: () => void;
  /** A refused action in words, for the chat's notice line. */
  onError: (text: string) => void;
}

/** The sender claimed the row meanwhile (409 not_manual): it is going out, never send it by hand too. */
const claimed = (e: unknown) => e instanceof ApiError && (e.body as { code?: unknown } | null)?.code === 'not_manual';

/** R-MSG-03/05: the server holds the row before WhatsApp opens so it is never sent twice. */
export function FailedSheet({ phone, message: m, onClose, onError }: FailedSheetProps) {
  const { color } = useTheme();
  const retry = useMessageAction(phone, 'retry');
  const handOff = useMessageAction(phone, 'hand-off');
  const sentManually = useMessageAction(phone, 'sent-manually');
  const failed = m?.status === 'failed';
  // Why, for a queued row too once it has a reason (an auth hold: 190, kapso_auth…); 'sending' is the
  // sender's claim, not a reason.
  const why = failed || (!!m?.error_code && m.error_code !== 'sending');
  // A text stopped by the 24 h window offers send via WhatsApp instead of the wa.me hand-off.
  const viaWhatsApp = m !== null && canSendViaWhatsApp(m);
  const link = viaWhatsApp ? null : (m?.click_to_chat ?? null);
  const sendViaWhatsApp = useWhatsAppSend(phone);
  const fail = (e: unknown) => onError(claimed(e) ? t.messages.alreadySending : t.common.error);
  /** The sheet closes; the action runs from these hooks (always mounted): errors still show. */
  const closeThen = (action: typeof retry, row: MessageView) => {
    onClose();
    action.mutate(row.id, { onError: fail });
  };
  const byHand = (row: MessageView, url: string) => {
    onClose();
    if (row.error_code === 'handed_off') return void Linking.openURL(url); // already held
    handOff.mutate(row.id, { onSuccess: () => void Linking.openURL(url), onError: fail });
  };
  return (
    <MenuSheet open={m !== null} label={t.messages.failedMenu} testID="failed-sheet" onClose={onClose}>
      {m && why ? (
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 }}>
          {errorLine(m)}
        </AppText>
      ) : null}
      {m && failed && canRetryCode(m.error_code) ? (
        <Button variant="secondary" label={t.messages.retry} onPress={() => closeThen(retry, m)} />
      ) : null}
      {m && link ? <Button variant="secondary" label={t.messages.clickToChat} onPress={() => byHand(m, link)} /> : null}
      {m && viaWhatsApp ? (
        <Button
          variant="primary"
          label={t.messages.whatsappSend.action}
          onPress={() => {
            onClose();
            sendViaWhatsApp(m, { onError });
          }}
        />
      ) : null}
      {m && viaWhatsApp ? (
        <SheetAnswers message={m} onAnswer={() => closeThen(sentManually, m)} />
      ) : null}
      <Button variant="secondary" label={t.common.cancel} onPress={onClose} />
    </MenuSheet>
  );
}
