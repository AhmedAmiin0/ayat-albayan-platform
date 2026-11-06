import { sendViaWhatsApp, type WhatsAppSendResult, whatsappSendUrl } from '@ab/client-core';
import { type MessageView, WHATSAPP_SEND_MS } from '@ab/shared';
import { type MutationState, useMutation, useMutationState } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { useMessageAction } from '@/inbox/thread/hooks/use-thread';

interface SendVars {
  message: MessageView;
}

type SendState = MutationState<WhatsAppSendResult<MessageView>, Error, SendVars>;

const KEY = ['whatsapp-send'] as const;

/**
 * wa.me with the family's digits and the text filled in: Android asks which WhatsApp opens it, so
 * staff pick WhatsApp Business (the academy number, linked on this phone as a companion device).
 */
const whatsappLink = (m: MessageView): string =>
  whatsappSendUrl('mobile', { phone: m.phone_e164, text: m.body ?? '' });

/** Opens WhatsApp; Linking throws when nothing can open the link. */
export async function openWhatsApp(m: MessageView): Promise<boolean> {
  await Linking.openURL(whatsappLink(m));
  return true;
}

/**
 * «أرسل عبر واتساب» (owner 2026-11-06): marks the row sent from WhatsApp FIRST (sent-manually: the
 * platform can then never send it too), and only then opens WhatsApp. The result stays in the
 * mutation cache, so the bubble offers «تراجع» when WhatsApp did not open.
 */
export function useWhatsAppSend(phone: string): (m: MessageView) => void {
  // POST /messages/:id/sent-manually: it also puts the marked row in the thread cache.
  const manual = useMessageAction(phone, 'sent-manually');
  const send = useMutation({
    mutationKey: KEY,
    // Kept as long as the server allows «تراجع» (WHATSAPP_SEND_MS), not TanStack's 5 minutes.
    gcTime: WHATSAPP_SEND_MS,
    mutationFn: ({ message }: SendVars) =>
      sendViaWhatsApp({
        mark: () => manual.mutateAsync(message.id),
        open: () => openWhatsApp(message),
      }),
  });
  return (message) => send.mutate({ message });
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
