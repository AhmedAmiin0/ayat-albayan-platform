import { canSendViaWhatsApp, type MessageView } from '@ab/shared';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { errorCode } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { useWhatsAppSend, useWhatsAppSendState } from './use-whatsapp-send';
import { WhatsAppOpenFailed } from './WhatsAppOpenFailed';

type Line = 'offer' | 'undo' | 'none';

/** Marked by this action but WhatsApp did not open, and still not echoed back by the app. */
const openFailed = (m: MessageView, opened: boolean | undefined): boolean =>
  opened === false && m.status === 'sent_manually';

const offerOrNone = (m: MessageView): Line => (canSendViaWhatsApp(m) ? 'offer' : 'none');

/** The line may have something to say: the offer, or the undo after a sent_manually mark. */
export const hasWhatsAppLine = (m: MessageView): boolean =>
  canSendViaWhatsApp(m) || (m.direction === 'outbound' && m.status === 'sent_manually');

/** A refused mark in words: the sender claimed it (409 not_manual), or any other error. */
const markError = (e: Error | null): string | null =>
  e && (errorCode(e) === 'not_manual' ? t.messages.alreadySending : t.common.error);

function Offer({ message: m }: { message: MessageView }) {
  const send = useWhatsAppSend();
  const state = useWhatsAppSendState(m.id);
  const error = markError(state?.error ?? null);
  return (
    <div className="mt-2 grid gap-2 border-t border-rule pt-2 text-2xs text-ink-2">
      <p>{t.messages.whatsappSend.hint}</p>
      <span>
        <Button size="sm" variant="secondary" disabled={state?.status === 'pending'} onClick={() => send(m)}>
          {t.messages.whatsappSend.action}
        </Button>
      </span>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  );
}

const LINES: Record<Line, (m: MessageView) => ReactNode> = {
  offer: (m) => <Offer message={m} />,
  undo: (m) => <WhatsAppOpenFailed message={m} />,
  none: () => null,
};

/**
 * «أرسل عبر واتساب» in the bubble's status lines (owner 2026-11-06), admin only: a staff text the
 * 24 h window stopped says why and offers the action; after it, when WhatsApp did not open, the
 * way to open it again or «تراجع».
 */
export function WhatsAppSendLine({ message: m }: { message: MessageView }) {
  const opened = useWhatsAppSendState(m.id)?.data?.opened;
  return LINES[openFailed(m, opened) ? 'undo' : offerOrNone(m)](m);
}
