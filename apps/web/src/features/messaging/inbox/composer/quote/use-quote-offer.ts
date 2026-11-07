import { offerText, pricingCountryOfPhone } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { quotePins } from './quote-id';
import { INITIAL_SELECTION, OTHER, quoteQuery, type Selection, useDebounced } from '@/features/finance/pricing';
import { sendText } from '@/features/messaging/inbox/api/api';
import { replayedOther, SEND_UNCONFIRMED } from '@ab/client-core';
import {
  ReplayedSend,
  rereadsAfter,
  sendErrorCode,
} from '@/features/messaging/inbox/composer/lib/send-error';
import { sendStart, settleOwnSend } from '@/features/messaging/inbox/composer/lib/send-start';

/** The calculator's default choice, with the country of the chat's number (+966 → SA …, else USD). */
export function initialSelection(phone: string): Selection {
  return { ...INITIAL_SELECTION, country: pricingCountryOfPhone(phone) ?? OTHER };
}

/**
 * The sheet's choice and its quote (GET /pricing/quote, debounced as on the calculator). `text` is
 * the calculator's own offer (offerText with ar.pricing: the guardian reads Arabic whatever the UI
 * language); null until the first quote. `stale`: the price shown is still the previous choice's.
 */
export function useQuoteOffer(phone: string) {
  const [sel, setSel] = useState(() => initialSelection(phone));
  const asked = useDebounced(sel);
  const quote = useQuery(quoteQuery(asked));
  return {
    sel,
    change: (patch: Partial<Selection>) => setSel((s) => ({ ...s, ...patch })),
    quote,
    text: quote.data ? offerText(quote.data, ar.pricing) : null,
    stale: sel !== asked || quote.isPlaceholderData,
  };
}

/** An offer as sent: its text, its id (the pinned one first) and the pins' generation. */
interface Offer {
  text: string;
  id: string;
  generation: number;
}

/**
 * «أرسل العرض»: the chat's own POST /threads/:phone/text. After no answer its id is pinned per
 * chat (quote-id) until a send with it gets an answer, 2xx or 4xx (docs/44 BUG7); no answer
 * re-reads the chat; a retry answered with the FIRST offer says this one did not go. It shares the
 * composer's mutation key, so neither sends while the other is in flight, and a second tap before
 * the re-render sends nothing (the ref). `onSent` closes the sheet. Like a template, a sent offer
 * settles a refused text attempt (settleOwnSend).
 */
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
    onSuccess: async (view, offer, start) => {
      quotePins.release(phone, offer.id, offer.generation);
      settleOwnSend(phone, view.id, start);
      onSent();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: async (e, offer) => {
      // No answer pins the id; an answer (a 4xx, or the first offer replayed) releases it.
      const keep = sendErrorCode(e) === SEND_UNCONFIRMED ? 'pin' : 'release';
      quotePins[keep](phone, offer.id, offer.generation);
      // The window closed (the sheet disables send and edit), or the offer may have gone.
      if (rereadsAfter(e)) await queryClient.invalidateQueries({ queryKey: ['threads'] });
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
