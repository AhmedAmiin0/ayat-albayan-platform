import { offerText, pricingCountryOfPhone } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { INITIAL_SELECTION, OTHER, quoteQuery, type Selection, useDebounced } from '@/features/finance/pricing';
import { sendText } from '../../api/api';
import { ownSendGeneration, recordOwnSend } from '../lib/own-send';

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

/**
 * «أرسل العرض»: the chat's own POST /threads/:phone/text with a new clientRequestId per tap. It
 * shares the composer's mutation key, so neither sends while the other is in flight, and a second
 * tap before the re-render sends nothing (the ref). `onSent` closes the sheet.
 */
export function useQuoteSend(phone: string, onSent: () => void) {
  const queryClient = useQueryClient();
  const mutationKey = ['inbox-send', phone];
  const busy = useRef(false);
  const send = useMutation({
    mutationKey,
    mutationFn: async (text: string) => {
      const gen = ownSendGeneration();
      return { view: await sendText({ phone, text, clientRequestId: crypto.randomUUID() }), gen };
    },
    onSuccess: async ({ view, gen }) => {
      recordOwnSend(phone, view.id, gen);
      onSent();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
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
      send.mutate(text);
    },
  };
}
