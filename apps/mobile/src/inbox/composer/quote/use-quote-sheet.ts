import { offerText, pricingCountryOfPhone } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { useIsMutating } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { DEFAULT_PRICING, type PricingSelection, useQuote } from '@/finance';
import { sendError } from '../../messages/hooks/message-text';
import { sendKey, useSendMessage } from '../../thread/hooks/use-thread';

/** The calculator's default choice, with the country of the chat's number (+966 → SA …, else USD). */
function initialSelection(phone: string): PricingSelection {
  return { ...DEFAULT_PRICING, country: pricingCountryOfPhone(phone) ?? 'other' };
}

/**
 * The sheet's choice and its quote from GET /pricing/quote. `text` is the calculator's own offer
 * (offerText with ar.pricing: the guardian reads Arabic whatever the UI language); null while the
 * first quote loads. `stale`: the card still holds the previous choice's price, so nothing may leave.
 */
export function useQuoteSheet(phone: string) {
  const [selection, setSelection] = useState(() => initialSelection(phone));
  const quote = useQuote(selection);
  return {
    selection,
    change: (patch: Partial<PricingSelection>) => setSelection((s) => ({ ...s, ...patch })),
    quote,
    text: quote.data ? offerText(quote.data, ar.pricing) : null,
    stale: quote.isPlaceholderData,
  };
}

/**
 * «أرسل العرض»: the text through the chat's own POST /threads/:phone/text (shown in the log at once),
 * a new clientRequestId per tap. While any send of this chat is in flight (the box's too, or a sheet
 * reopened meanwhile: the shared mutation key) nothing else goes; a second tap before the re-render is
 * held by the ref. `onSent` closes the sheet; the sheet stays open while sending.
 */
export function useQuoteSend(phone: string, onSent: () => void) {
  const send = useSendMessage(phone);
  const busy = useRef(false);
  const pending = useIsMutating({ mutationKey: sendKey(phone) }) > 0;
  return {
    pending,
    error: send.isError ? sendError(send.error) : null,
    send: (text: string) => {
      if (busy.current || pending) return;
      busy.current = true;
      send.mutate(
        { out: { kind: 'text', text }, id: requestId() },
        { onSuccess: onSent, onSettled: () => (busy.current = false) },
      );
    },
  };
}
