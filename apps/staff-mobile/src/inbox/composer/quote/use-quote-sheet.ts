import { offerText, pricingCountryOfPhone } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { useIsMutating } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { DEFAULT_PRICING, type PricingSelection, useQuote } from '@/finance';
import { t } from '@ab/mobile-kit';
import { PINS, pinnedId, useReplayed } from '@/inbox/thread/send/pinned-send';
import { chatSendError } from '@/inbox/thread/send/send-error';
import { useQuoteCustom } from './use-quote-custom';
import { sendKey, useSendMessage } from '@/inbox/thread/hooks/use-thread';

/** The calculator's default choice, with the country of the chat's number (+966 → SA …, else USD). */
function initialSelection(phone: string): PricingSelection {
  return { ...DEFAULT_PRICING, country: pricingCountryOfPhone(phone) ?? 'other' };
}

/** The offer text is always Arabic for the guardian; while stale or invalid nothing may leave. */
export function useQuoteSheet(phone: string) {
  const [selection, setSelection] = useState(() => initialSelection(phone));
  const quote = useQuote(selection);
  const custom = useQuoteCustom(quote.data);
  return {
    selection,
    change: (patch: Partial<PricingSelection>) => setSelection((s) => ({ ...s, ...patch })),
    quote,
    text: quote.data ? offerText(quote.data, ar.pricing, custom.total) : null,
    stale: quote.isPlaceholderData,
    custom: custom.price,
    invalid: !custom.valid,
  };
}

/** After no answer the id is pinned per chat (docs/44 BUG7); one send per chat at a time. */
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
