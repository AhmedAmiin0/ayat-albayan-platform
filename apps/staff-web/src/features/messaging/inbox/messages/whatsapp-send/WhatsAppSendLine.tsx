import { APP_SEND_ANSWERS, type AppSendLine as Line, appSendLineOf } from '@ab/client-core';
import { canSendViaWhatsApp, type MessageView } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { AppSendAnswers } from './AppSendAnswers';
import { useWhatsAppSend, useWhatsAppSendState } from './use-whatsapp-send';
import { appSendError } from './whatsapp-send.api';

interface LineProps {
  message: MessageView;
  now: Date;
}

/** The line has something to say: a staff text the 24 h window stopped (pending or not). */
export const hasWhatsAppLine = (m: MessageView): boolean => !m.hidden && canSendViaWhatsApp(m);

/** What the line says, and its send button (app-send, then WhatsApp Web). */
const COPY: Record<Line, { text: () => string; button: () => string }> = {
  offer: {
    text: () => t.messages.whatsappSend.hint,
    button: () => t.messages.whatsappSend.action,
  },
  pending: {
    text: () => `${t.messages.whatsappSend.pending} ${t.messages.whatsappSend.pendingHint}`,
    button: () => t.messages.whatsappSend.openAgain,
  },
  unconfirmed: {
    text: () => t.messages.whatsappSend.askSent,
    button: () => t.messages.whatsappSend.action,
  },
};

/** Admin only (docs/19); with no echo once the window passes, the platform never sends it. */
export function WhatsAppSendLine({ message: m, now }: LineProps) {
  const send = useWhatsAppSend();
  const state = useWhatsAppSendState(m.id);
  const error = appSendError(state?.error ?? null);
  const line = appSendLineOf(m, now);
  const copy = COPY[line];
  return (
    <div className="mt-2 grid gap-2 border-t border-rule pt-2 text-2xs text-ink-2">
      <p>{copy.text()}</p>
      <span className="flex flex-wrap gap-2">
        <AppSendAnswers message={m} answers={APP_SEND_ANSWERS[line]} />
        <Button size="sm" variant="secondary" disabled={state?.status === 'pending'} onClick={() => send(m)}>
          {copy.button()}
        </Button>
      </span>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  );
}
