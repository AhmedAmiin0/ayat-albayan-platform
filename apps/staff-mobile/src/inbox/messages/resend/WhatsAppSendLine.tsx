import { canSendViaWhatsApp, type MessageView } from '@ab/shared';
import { View } from 'react-native';
import { t, type, useTheme, AppText, Button, useHolds, useNow, ErrorLine } from '@ab/mobile-kit';
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

/** Admin only; without an echo the platform never sends it; a confirmed manual send is final. */
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
