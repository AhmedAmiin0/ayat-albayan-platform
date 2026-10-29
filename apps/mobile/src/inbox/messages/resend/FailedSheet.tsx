import { canRetryCode, type MessageView } from '@ab/shared';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { MenuSheet } from '@/core/ui/feedback/MenuSheet';
import { useMessageAction } from '../../thread/hooks/use-thread';
import { errorLine } from '../hooks/message-text';

interface FailedSheetProps {
  phone: string;
  /** The row whose «! لم تُرسل» (or queued clock) was tapped; null hides the sheet. */
  message: MessageView | null;
  onClose: () => void;
  /** A refused action in words, for the chat's notice line. */
  onError: (text: string) => void;
}

/** The sender claimed the row meanwhile (409 not_manual): it is going out, never send it by hand too. */
const claimed = (e: unknown) => e instanceof ApiError && (e.body as { code?: unknown } | null)?.code === 'not_manual';

/**
 * A tap on an admin's row that did not go out (R-MSG-03/05), as WhatsApp's «!» menu: why in full,
 * «حاول مرة أخرى» only where trying again can help (canRetryCode: not while the WhatsApp Business
 * account is blocked, 131042…), «أرسلها بنفسك من واتساب» (the API's wa.me link with the text filled
 * in), which first tells the server: it holds the row so the sender never sends it too, and the
 * row then asks «هل أرسلتها؟» itself. WhatsApp opens only once the server holds the row. Drawn once
 * per chat and always mounted: a hand-off answered after the sheet closed still opens WhatsApp.
 */
export function FailedSheet({ phone, message: m, onClose, onError }: FailedSheetProps) {
  const { color } = useTheme();
  const retry = useMessageAction(phone, 'retry');
  const handOff = useMessageAction(phone, 'hand-off');
  const failed = m?.status === 'failed';
  const link = m?.click_to_chat ?? null;
  const fail = (e: unknown) => onError(claimed(e) ? t.messages.alreadySending : t.common.error);
  const tryAgain = (row: MessageView) => {
    onClose();
    retry.mutate(row.id, { onError: fail });
  };
  const byHand = (row: MessageView, url: string) => {
    onClose();
    if (row.error_code === 'handed_off') return void Linking.openURL(url); // already held
    handOff.mutate(row.id, { onSuccess: () => void Linking.openURL(url), onError: fail });
  };
  return (
    <MenuSheet open={m !== null} label={t.messages.failedMenu} testID="failed-sheet" onClose={onClose}>
      {m && failed ? (
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 }}>
          {errorLine(m)}
        </AppText>
      ) : null}
      {m && failed && canRetryCode(m.error_code) ? (
        <Button variant="secondary" label={t.messages.retry} onPress={() => tryAgain(m)} />
      ) : null}
      {m && link ? <Button variant="secondary" label={t.messages.clickToChat} onPress={() => byHand(m, link)} /> : null}
      <Button variant="secondary" label={t.common.cancel} onPress={onClose} />
    </MenuSheet>
  );
}
