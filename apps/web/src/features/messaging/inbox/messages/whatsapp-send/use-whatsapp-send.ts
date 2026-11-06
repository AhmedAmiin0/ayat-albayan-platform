import { sendViaWhatsApp, type WhatsAppSendResult, whatsappSendUrl } from '@ab/client-core';
import { type MessageView, WHATSAPP_SEND_MS } from '@ab/shared';
import {
  type MutationState,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query';
import { markSentManually } from '@/features/messaging/inbox/api/api';
import { apiSend } from '@/lib/http/api';

/** One «أرسل عبر واتساب»: the row, and the tab opened in the click (null: blocked). */
interface SendVars {
  message: MessageView;
  tab: Window | null;
}

type SendState = MutationState<WhatsAppSendResult<MessageView>, Error, SendVars>;

const KEY = ['whatsapp-send'] as const;

/** «تراجع»: sent_manually → queued while no app echo came back (≤ 30 min, retry?undo=whatsapp). */
const undoWhatsAppSend = (id: string) => apiSend('POST', `/messages/${id}/retry?undo=whatsapp`);

/** WhatsApp Web (never the Windows app: coexistence does not support it), the text filled in. */
export const whatsappWebUrl = (m: MessageView): string =>
  whatsappSendUrl('web', { phone: m.phone_e164, text: m.body ?? '' });

/**
 * A blank tab opened now, inside the click: one opened after the request would be popup-blocked.
 * No opener (noopener); it is sent to WhatsApp Web only once the server marked the row.
 */
function blankTab(): Window | null {
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  return tab;
}

/** WhatsApp Web in the tab; false when there is none (the browser blocked it). */
function openIn(tab: Window | null, url: string): boolean {
  tab?.location.replace(url);
  return tab !== null;
}

/**
 * «أرسل عبر واتساب» (owner 2026-11-06): marks the row sent from WhatsApp FIRST (sent-manually: the
 * platform can then never send it too), and only then opens WhatsApp Web. A refused mark closes
 * the blank tab. The result stays in the mutation cache: the bubble offers «تراجع» if not opened.
 */
export function useWhatsAppSend(): (m: MessageView) => void {
  const client = useQueryClient();
  const send = useMutation({
    mutationKey: KEY,
    // Kept as long as the server allows «تراجع» (WHATSAPP_SEND_MS), not TanStack's 5 minutes.
    gcTime: WHATSAPP_SEND_MS,
    mutationFn: ({ message, tab }: SendVars) =>
      sendViaWhatsApp({
        mark: () => markSentManually(message.id),
        open: () => openIn(tab, whatsappWebUrl(message)),
      }),
    onError: (_e, { tab }) => tab?.close(),
    onSettled: () => client.invalidateQueries({ queryKey: ['threads'] }),
  });
  return (message) => send.mutate({ message, tab: blankTab() });
}

/** The last «أرسل عبر واتساب» of this row in this session (any bubble or menu that started it). */
export function useWhatsAppSendState(id: string): SendState | undefined {
  const mine = (vars: unknown): boolean => (vars as SendVars | undefined)?.message.id === id;
  const states = useMutationState({
    filters: { mutationKey: KEY, predicate: (m) => mine(m.state.variables) },
    select: (m) => m.state as SendState,
  });
  return states.at(-1);
}

/** «تراجع»: the row back to the queue (retry?undo=whatsapp: sent_manually → queued). */
export function useWhatsAppUndo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: undoWhatsAppSend,
    onSettled: () => client.invalidateQueries({ queryKey: ['threads'] }),
  });
}
