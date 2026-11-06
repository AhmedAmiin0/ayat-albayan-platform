import { offerText, pricingCountryOfPhone } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { useIsMutating } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { DEFAULT_PRICING, type PricingSelection, useQuote } from '@/finance';
import { t } from '@/core/lib/i18n/i18n';
import { PINS, pinnedId, useReplayed } from '@/inbox/thread/send/pinned-send';
import { chatSendError } from '@/inbox/thread/send/send-error';
import { sendKey, useSendMessage } from '@/inbox/thread/hooks/use-thread';

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
 * «أرسل العرض»: the text through the chat's own POST /threads/:phone/text (shown in the log at once).
 * After no answer its id is pinned per chat until an answer (docs/44 BUG7, also across the sheet
 * closing); a replay answered with the first offer keeps the sheet open with the note. While any send of this chat is in flight (the box's too, or a sheet
 * reopened meanwhile: the shared mutation key) nothing else goes; a second tap before the re-render is
 * held by the ref. `onSent` closes the sheet; the sheet stays open while sending.
 */
export function useQuoteSend(phone: string, onSent: () => void) {
  const send = useSendMessage(phone);
  const busy = useRef(false);
  const pending = useIsMutating({ mutationKey: sendKey(phone) }) > 0;
  const replayed = useReplayed('quote', phone);
  const error = send.isError ? chatSendError(send.error) : null;
  return {
    pending,
    error: replayed ? t.inbox.error.send_replayed : error,
    send: (text: string) => {
      if (busy.current || pending) return;
      busy.current = true;
      PINS.quote.setReplayed(phone, false);
      const id = pinnedId('quote', phone, requestId());
      const closeUnlessReplayed = () => {
        if (!PINS.quote.replayed(phone)) onSent();
      };
      send.mutate(
        { out: { kind: 'text', text }, id, pin: 'quote' },
        { onSuccess: closeUnlessReplayed, onSettled: () => (busy.current = false) },
      );
    },
  };
}
