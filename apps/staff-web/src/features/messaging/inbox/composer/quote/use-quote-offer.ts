import { offerText, pricingCountryOfPhone } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { quotePins } from './quote-id';
import { useQuoteCustom } from './use-quote-custom';
import { INITIAL_SELECTION, OTHER, quoteQuery, type Selection, useDebounced } from '@/features/finance/pricing';
import { sendText } from '@/features/messaging/inbox/api/api';
import { replayedOther, SEND_UNCONFIRMED } from '@ab/client-core';
import {
  ReplayedSend,
  rereadsAfter,
  sendErrorCode,
} from '@/features/messaging/inbox/composer/lib/send-error';
import { sendStart, settleOwnSend } from '@/features/messaging/inbox/composer/lib/send-start';
import { rereadSentChat, showAnswer } from '@/features/messaging/inbox/api/send-cache';

/** The calculator's default choice, with the country of the chat's number (+966 → SA …, else USD). */
export function initialSelection(phone: string): Selection {
  return { ...INITIAL_SELECTION, country: pricingCountryOfPhone(phone) ?? OTHER };
}

/** The offer text is Arabic whatever the UI language; `stale` means the old choice's price. */
export function useQuoteOffer(phone: string) {
  const [sel, setSel] = useState(() => initialSelection(phone));
  const asked = useDebounced(sel);
  const quote = useQuery(quoteQuery(asked));
  const custom = useQuoteCustom(quote.data);
  return {
    sel,
    change: (patch: Partial<Selection>) => setSel((s) => ({ ...s, ...patch })),
    quote,
    text: quote.data ? offerText(quote.data, ar.pricing, custom.total) : null,
    stale: sel !== asked || quote.isPlaceholderData,
    custom: custom.price,
    invalid: !custom.valid,
  };
}

/** An offer as sent: its text, its id (the pinned one first) and the pins' generation. */
interface Offer {
  text: string;
  id: string;
  generation: number;
}

/** docs/44 BUG7: after no answer the id is pinned per chat until a send gets a 2xx or 4xx. */
export function useQuoteSend(phone: string, onSent: () => void) {
  const queryClient = useQueryClient();
  const mutationKey = ['inbox-send', phone];
  const busy = useRef(false);
  const send = useMutation({
    mutationKey,
    mutationFn: async ({ text, id }: Offer) => {
      const view = await sendText({ phone, text, clientRequestId: id });
      // Every 2xx: a kept id may replay the first offer even after a 4xx released it.
      if (replayedOther(view, { text })) throw new ReplayedSend();
      return view;
    },
    onMutate: sendStart,
    onSuccess: (view, offer, start) => {
      quotePins.release(phone, offer.id, offer.generation);
      settleOwnSend(phone, view.id, start);
      onSent();
      showAnswer(queryClient, view);
    },
    onError: async (e, offer) => {
      // No answer pins the id; an answer (a 4xx, or the first offer replayed) releases it.
      const keep = sendErrorCode(e) === SEND_UNCONFIRMED ? 'pin' : 'release';
      quotePins[keep](phone, offer.id, offer.generation);
      // The window closed (the sheet disables send and edit), or the offer may have gone.
      if (rereadsAfter(e)) await rereadSentChat(queryClient, phone);
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const pending = useIsMutating({ mutationKey }) > 0;
  return {
    pending,
    error: send.error,
    send: (text: string) => {
      if (busy.current || pending) return;
      busy.current = true;
      const id = quotePins.pinned(phone) ?? crypto.randomUUID();
      send.mutate({ text, id, generation: quotePins.generation() });
    },
  };
}
