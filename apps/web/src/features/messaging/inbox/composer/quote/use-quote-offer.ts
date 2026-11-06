import { offerText, pricingCountryOfPhone } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { quoteIdOf, quoteSent, quoteUnconfirmed } from './quote-id';
import { INITIAL_SELECTION, OTHER, quoteQuery, type Selection, useDebounced } from '@/features/finance/pricing';
import { sendText } from '@/features/messaging/inbox/api/api';
import { replayedOther, SEND_UNCONFIRMED } from '@ab/client-core';
import { chatRows } from '@/features/messaging/inbox/api/unconfirmed-watch';
import { ReplayedSend, rereadsAfter, sendErrorCode } from '@/features/messaging/inbox/composer/lib/send-error';
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

/** An offer as sent: its text, when, and the chat's row ids then (for the read match). */
interface Offer {
  text: string;
  at: string;
  known: ReadonlySet<string>;
}

/**
 * «أرسل العرض»: the chat's own POST /threads/:phone/text with the chat's quote id (quote-id: kept
 * until an offer goes or a read shows it, docs/44 BUG7). No answer re-reads the chat; a retry
 * answered with the FIRST offer says this one did not go (a new id next). It shares the
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
    mutationFn: async ({ text }: Offer) => {
      const quote = quoteIdOf(phone);
      const view = await sendText({ phone, text, clientRequestId: quote.id });
      if (quote.unconfirmed && replayedOther(view, text)) throw new ReplayedSend();
      return view;
    },
    onMutate: sendStart,
    onSuccess: async (view, _offer, start) => {
      quoteSent(phone);
      settleOwnSend(phone, view.id, start);
      onSent();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: async (e, offer) => {
      const code = sendErrorCode(e);
      if (code === SEND_UNCONFIRMED) quoteUnconfirmed(phone, offer);
      else quoteSent(phone);
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
      const known = new Set(chatRows(queryClient, phone).map((m) => m.id));
      send.mutate({ text, at: new Date().toISOString(), known });
    },
  };
}
