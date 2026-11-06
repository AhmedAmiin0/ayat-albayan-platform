import { sendViaWhatsApp, type WhatsAppSendResult, whatsappSendUrl } from '@ab/client-core';
import { type AppSendRefusal, appSendRefusal, type MessageView } from '@ab/shared';
import { type MutationState, useMutation, useMutationState } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { useMessageAction } from '@/inbox/thread/hooks/use-thread';

interface SendVars {
  message: MessageView;
}

type SendState = MutationState<WhatsAppSendResult<MessageView>, Error, SendVars>;

/** A caller that reports a refused tap itself (the «!» sheet closes before the answer). */
interface SendOpts {
  onError?: (text: string) => void;
}

const KEY = ['whatsapp-send'] as const;

/**
 * wa.me with the family's digits and the text filled in: Android asks which WhatsApp opens it, so
 * staff pick WhatsApp Business (the academy number, linked on this phone as a companion device).
 */
const whatsappLink = (m: MessageView): string =>
  whatsappSendUrl('mobile', { phone: m.phone_e164, text: m.body ?? '' });

/** Opens WhatsApp; Linking throws when nothing can open the link. */
async function openWhatsApp(m: MessageView): Promise<boolean> {
  await Linking.openURL(whatsappLink(m));
  return true;
}

/** A 409's words come from the row's status in its body: never «تُرسل الآن» for a sent row. */
const REFUSALS: Record<AppSendRefusal, () => string> = {
  sending: () => t.messages.alreadySending,
  sent: () => t.messages.whatsappSend.alreadySent,
  other: () => t.messages.whatsappSend.notNow,
};

/** A refused or failed tap in words: the 409 by its status, anything else the generic error. */
export function sendErrorText(e: unknown): string {
  const refusal = e instanceof ApiError ? appSendRefusal(e.body) : null;
  return refusal ? REFUSALS[refusal]() : t.common.error;
}

/**
 * «أرسل عبر واتساب» (owner 2026-11-06, docs/19): POST /messages/:id/app-send first (the platform
 * then never sends the row for a few minutes), then wa.me. Nothing is marked sent: the app's echo
 * confirms it. The app-send action puts the pending row in the thread cache and, settled, re-reads
 * the chat and its anchored windows (refreshInbox with the phone). A second tap extends the window.
 */
export function useWhatsAppSend(phone: string): (m: MessageView, opts?: SendOpts) => void {
  const appSend = useMessageAction(phone, 'app-send');
  const send = useMutation({
    mutationKey: KEY,
    mutationFn: ({ message }: SendVars) =>
      sendViaWhatsApp({
        start: () => appSend.mutateAsync(message.id),
        open: () => openWhatsApp(message),
      }),
  });
  return (message, opts) =>
    send.mutate({ message }, { onError: (e) => opts?.onError?.(sendErrorText(e)) });
}

/** The last «أرسل عبر واتساب» of this row in this session (the bubble's line or the sheet). */
export function useWhatsAppSendState(id: string): SendState | undefined {
  const mine = (vars: unknown): boolean => (vars as SendVars | undefined)?.message.id === id;
  const states = useMutationState({
    filters: { mutationKey: KEY, predicate: (m) => mine(m.state.variables) },
    select: (m) => m.state as SendState,
  });
  return states.at(-1);
}
