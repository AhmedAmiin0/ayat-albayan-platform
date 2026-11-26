import {
  DEFAULT_ROUNDING,
  offerText,
  parseDiscount,
  priceListText,
  pricingCountryOfPhone,
  type Rounding,
} from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { useIsMutating } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { DEFAULT_PRICING, type PricingSelection, useQuote } from '@/finance';
import { t } from '@ab/mobile-kit';
import { PINS, pinnedId, useReplayed } from '@/inbox/thread/send/pinned-send';
import { chatSendError } from '@/inbox/thread/send/send-error';
import { usePriceList } from './use-price-list';
import { useQuoteCustom } from './use-quote-custom';
import type { QuoteMode, QuoteOffer } from './use-quote-sheet.types';
import { sendKey, useSendMessage } from '@/inbox/thread/hooks/use-thread';

/** What either price query tells the sheet. */
interface Priced {
  isPlaceholderData: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

/** The calculator's default choice, with the country of the chat's number (+966 → SA, else USD). */
function initialSelection(phone: string): PricingSelection {
  return { ...DEFAULT_PRICING, country: pricingCountryOfPhone(phone) ?? 'other' };
}

/**
 * Rounding only moves a discounted price, so with no discount the choice is not asked for and
 * the request stays the one the sheet always made.
 */
const askedRounding = (discount: number, rounding: Rounding): Rounding =>
  discount > 0 ? rounding : DEFAULT_ROUNDING;

/** A price still loading for a new choice is the last choice's: its text is held back. */
function offerOf(priced: Priced, text: string | null, blocked = false): QuoteOffer {
  return {
    text,
    held: priced.isPlaceholderData || blocked,
    failed: priced.isError,
    retry: () => void priced.refetch(),
  };
}

/**
 * One choice for both modes, so switching keeps it; only the mode on screen asks the API. The
 * message is always Arabic for the guardian; while stale or invalid nothing may leave.
 */
export function useQuoteSheet(phone: string) {
  const [selection, setSelection] = useState(() => initialSelection(phone));
  const [mode, setMode] = useState<QuoteMode>('one');
  const [rounding, setRounding] = useState(DEFAULT_ROUNDING);
  const { country, students } = selection;
  const discount = parseDiscount(selection.discount);
  const asked = askedRounding(discount, rounding);
  const quote = useQuote(selection, { rounding: asked, enabled: mode === 'one' });
  const list = usePriceList({ country, students, discount, rounding: asked }, mode === 'all');
  const custom = useQuoteCustom(quote.data);
  const one = quote.data ? offerText(quote.data, ar.pricing, custom.total) : null;
  const all = list.data ? priceListText(list.data, ar.pricing) : null;
  const offers: Record<QuoteMode, QuoteOffer> = {
    one: offerOf(quote, one, !custom.valid),
    all: offerOf(list, all),
  };
  // A custom amount is the total itself: rounding has nothing to move. The list has no such amount.
  const customTotal = mode === 'one' && custom.price.on;
  return {
    mode,
    setMode,
    selection,
    change: (patch: Partial<PricingSelection>) => setSelection((s) => ({ ...s, ...patch })),
    rounding,
    setRounding,
    roundable: discount > 0 && !customTotal,
    custom: custom.price,
    offer: offers[mode],
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
