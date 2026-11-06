import { sendViaWhatsApp, type WhatsAppSendResult, whatsappSendUrl } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import {
  type MutationState,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';
import { startAppSend } from './whatsapp-send.api';

/** One «أرسل عبر واتساب»: the row, and the tab opened in the click (null: blocked). */
interface SendVars {
  message: MessageView;
  tab: Window | null;
}

type SendState = MutationState<WhatsAppSendResult<void>, Error, SendVars>;

const KEY = ['whatsapp-send'] as const;

/** WhatsApp Web (never the Windows app: coexistence does not support it), the text filled in. */
const whatsappWebUrl = (m: MessageView): string =>
  whatsappSendUrl('web', { phone: m.phone_e164, text: m.body ?? '' });

/**
 * A blank tab opened now, inside the click: one opened after the request would be popup-blocked.
 * No opener (noopener); it is sent to WhatsApp Web only once the server agreed.
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
 * «أرسل عبر واتساب» (owner 2026-11-06, docs/19): app-send first (the platform keeps off the row
 * for 10 minutes; nothing is marked sent), then WhatsApp Web. A refused tap closes the blank tab.
 * «افتح واتساب مجددًا» runs the same: the window is extended and WhatsApp opens again.
 */
export function useWhatsAppSend(): (m: MessageView) => void {
  const client = useQueryClient();
  const send = useMutation({
    mutationKey: KEY,
    mutationFn: ({ message, tab }: SendVars) =>
      sendViaWhatsApp({
        start: () => startAppSend(message.id),
        open: () => openIn(tab, whatsappWebUrl(message)),
      }),
    onError: (_e, { tab }) => tab?.close(),
    onSettled: (_r, _e, { message }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['threads'] }),
        refreshAnchored(client, message.phone_e164),
      ]),
  });
  return (message) => send.mutate({ message, tab: blankTab() });
}

/** The last «أرسل عبر واتساب» of this row in this session (busy and error only). */
export function useWhatsAppSendState(id: string): SendState | undefined {
  const mine = (vars: unknown): boolean => (vars as SendVars | undefined)?.message.id === id;
  const states = useMutationState({
    filters: { mutationKey: KEY, predicate: (m) => mine(m.state.variables) },
    select: (m) => m.state as SendState,
  });
  return states.at(-1);
}
