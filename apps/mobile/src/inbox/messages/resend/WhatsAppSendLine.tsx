import { appSendPending, canSendViaWhatsApp, type MessageView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { type, useTheme } from '@/theme';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { useHolds } from '@/core/auth/use-permissions';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { sendErrorText, useWhatsAppSend, useWhatsAppSendState } from './use-whatsapp-send';

type Line = 'offer' | 'pending';

interface LineProps {
  message: MessageView;
  phone: string;
}

/** What each state says, and the button that (re)starts the send (app-send, then wa.me). */
const LINES: Record<Line, { texts: () => string[]; label: () => string; testID: string }> = {
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
 * واتساب…» and «افتح واتساب مجددًا», which extends it. No undo: nothing was marked sent.
 */
function WhatsAppSendLine(p: LineProps) {
  const now = useNow();
  return <SendLine {...p} line={appSendPending(p.message, now) ? 'pending' : 'offer'} />;
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
