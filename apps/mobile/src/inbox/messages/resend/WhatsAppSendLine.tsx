import { canSendViaWhatsApp, type MessageView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { type, useTheme } from '@/theme';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { useHolds } from '@/core/auth/use-permissions';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { APP_SEND_ANSWERS, type AppSendLine as Line, appSendLineOf } from '@ab/client-core';
import { AppSendAnswers } from './AppSendAnswers';
import { sendErrorText, useWhatsAppSend, useWhatsAppSendState } from './use-whatsapp-send';

interface LineProps {
  message: MessageView;
  phone: string;
}

interface LineCopy {
  texts: () => string[];
  label: () => string;
  testID: string;
}

/** What each state says, and the button that (re)starts the send (app-send, then wa.me). */
const LINES: Record<Line, LineCopy> = {
  offer: {
    texts: () => [t.messages.whatsappSend.hint],
    label: () => t.messages.whatsappSend.action,
    testID: 'whatsapp-send-line',
  },
  pending: {
    texts: () => [t.messages.whatsappSend.pending, t.messages.whatsappSend.pendingHint],
    label: () => t.messages.whatsappSend.openAgain,
    testID: 'whatsapp-send-pending',
  },
  unconfirmed: {
    texts: () => [t.messages.whatsappSend.askSent],
    label: () => t.messages.whatsappSend.action,
    testID: 'whatsapp-send-unconfirmed',
  },
};

function SendLine({ message: m, phone, line }: LineProps & { line: Line }) {
  const { color } = useTheme();
  const send = useWhatsAppSend(phone);
  const state = useWhatsAppSendState(m.id);
  const error = state?.error ? sendErrorText(state.error) : null;
  const size = type.size.xs;
  const style = {
    fontFamily: type.ui[400],
    fontSize: size,
    lineHeight: type.lineHeight(size),
    color: color.ink2,
  };
  const shown = LINES[line];
  return (
    <View style={{ gap: 6, marginTop: 4 }} testID={shown.testID}>
      {shown.texts().map((text) => (
        <AppText key={text} style={style}>
          {text}
        </AppText>
      ))}
      <AppSendAnswers message={m} phone={phone} answers={APP_SEND_ANSWERS[line]} />
      <Button
        variant="secondary"
        label={shown.label()}
        busy={state?.status === 'pending'}
        onPress={() => send(m)}
      />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}

/**
 * «أرسل عبر واتساب» under a staff text the 24 h window stopped (owner 2026-11-06), admin only: why,
 * and the action; while its window is open (app_send_until, re-read every minute) «جارٍ الإرسال من
 * واتساب…», «افتح واتساب مجددًا» (extends it) and «أرسلتها». With no echo once it passes, the
 * platform never sends it: «هل أرسلتها من واتساب؟» with «نعم، أرسلتها» (never put back).
 */
function WhatsAppSendLine(p: LineProps) {
  const now = useNow();
  return <SendLine {...p} line={appSendLineOf(p.message, now)} />;
}

/** The admin's (admin mode with messages.manage, the app-send endpoint's permission). */
function AdminOnly(p: LineProps) {
  const admin = useThreadMode().kind === 'admin';
  const manages = useHolds('messages.manage');
  return admin && manages ? <WhatsAppSendLine {...p} /> : null;
}

/**
 * In the bubble's status line (MessageMeta), only when it has something to say (no hook before
 * that: most bubbles never reach one), then only for the admin. Teacher mode never.
 */
export function WhatsAppStatusLine(p: LineProps) {
  return !p.message.hidden && canSendViaWhatsApp(p.message) ? <AdminOnly {...p} /> : null;
}
