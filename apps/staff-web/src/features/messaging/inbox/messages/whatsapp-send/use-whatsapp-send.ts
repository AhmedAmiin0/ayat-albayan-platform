import { sendViaWhatsApp, type WhatsAppSendResult, whatsappSendUrl } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import {
  type MutationState,
  type QueryClient,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';
import { rereadSentChat } from '@/features/messaging/inbox/api/send-cache';
import { startAppSend } from './whatsapp-send.api';

/** Null tab means the popup was blocked. */
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

/** App-send keeps the platform off the row for 10 minutes and marks nothing sent (docs/19). */
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
    // The answer is not parsed (startAppSend): this chat reads its row, never every chat.
    onSettled: (_r, _e, { message }) =>
      Promise.all([
        rereadSentChat(client, message.phone_e164),
        refreshAnchored(client, message.phone_e164),
      ]),
  });
  return (message) => send.mutate({ message, tab: blankTab() });
}

const isRow = (vars: unknown, id: string): boolean =>
  (vars as SendVars | undefined)?.message.id === id;

/** After staff answered, an earlier tap's error no longer describes the row. */
export function clearWhatsAppSend(client: QueryClient, id: string): void {
  const cache = client.getMutationCache();
  const mine = cache.findAll({
    mutationKey: KEY,
    predicate: (m) => isRow(m.state.variables, id),
  });
  for (const m of mine) cache.remove(m);
}

export function useWhatsAppSendState(id: string): SendState | undefined {
  const states = useMutationState({
    filters: { mutationKey: KEY, predicate: (m) => isRow(m.state.variables, id) },
    select: (m) => m.state as SendState,
  });
  return states.at(-1);
}
