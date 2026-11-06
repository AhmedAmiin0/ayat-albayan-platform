import { canSendViaWhatsApp, type MessageView, stoppedByWindow } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { useHolds } from '@/core/auth/use-permissions';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { useWhatsAppSend, useWhatsAppSendState } from './use-whatsapp-send';
import { WhatsAppOpenFailed } from './WhatsAppOpenFailed';

type Line = 'offer' | 'undo' | 'none';

interface LineProps {
  message: MessageView;
  phone: string;
}

/** The sender claimed it meanwhile (409 not_manual): it is going out, never send it by hand too. */
const claimed = (e: unknown): boolean =>
  e instanceof ApiError && (e.body as { code?: unknown } | null)?.code === 'not_manual';

const markError = (e: Error | null): string | null =>
  e && (claimed(e) ? t.messages.alreadySending : t.common.error);

const offerOrNone = (m: MessageView): Line => (canSendViaWhatsApp(m) ? 'offer' : 'none');

/** The line may have something to say: the offer, or the undo after a sent_manually mark. */
const hasWhatsAppLine = (m: MessageView): boolean =>
  canSendViaWhatsApp(m) || (m.direction === 'outbound' && m.status === 'sent_manually');

function Offer({ message: m, phone }: LineProps) {
  const { color } = useTheme();
  const send = useWhatsAppSend(phone);
  const state = useWhatsAppSendState(m.id);
  const error = markError(state?.error ?? null);
  const size = type.size.xs;
  const hint = {
    fontFamily: type.ui[400],
    fontSize: size,
    lineHeight: type.lineHeight(size),
    color: color.ink2,
  };
  return (
    <View style={{ gap: 6, marginTop: 4 }} testID="whatsapp-send-line">
      <AppText style={hint}>{t.messages.whatsappSend.hint}</AppText>
      <Button
        variant="secondary"
        label={t.messages.whatsappSend.action}
        busy={state?.status === 'pending'}
        onPress={() => send(m)}
      />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}

const LINES: Record<Line, (p: LineProps) => ReactNode> = {
  offer: (p) => <Offer {...p} />,
  undo: (p) => <WhatsAppOpenFailed {...p} />,
  none: () => null,
};

/**
 * «أرسل عبر واتساب» under a staff text the 24 h window stopped (owner 2026-11-06), admin only: why,
 * and the action; after it, when WhatsApp did not open, «افتح واتساب» or «تراجع».
 */
function WhatsAppSendLine(p: LineProps) {
  const opened = useWhatsAppSendState(p.message.id)?.data?.opened;
  // The mark stands on the server even while the cached row still shows held.
  const marked = p.message.status === 'sent_manually' || stoppedByWindow(p.message);
  const failedOpen = opened === false && marked;
  return LINES[failedOpen ? 'undo' : offerOrNone(p.message)](p);
}

/** The admin's (admin mode with messages.manage, the sent-manually endpoint's permission). */
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
  return !p.message.hidden && hasWhatsAppLine(p.message) ? <AdminOnly {...p} /> : null;
}
