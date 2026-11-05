import { parseAmount } from '@ab/shared';

/** The quote's price and its currency (POST /subscriptions/quote or /sales/subscriptions/quote). */
export interface QuotedPrice {
  afterDiscount: number;
  currency: string;
}

/** What the save adds: nothing while «مبلغ مخصص» is off, else the typed `customPrice`. */
interface CustomPriceBody {
  customPrice?: number;
}

type CustomPriceCheck = { ok: true; body: CustomPriceBody } | { ok: false };

const OFF: CustomPriceCheck = { ok: true, body: {} };

/** Typed text read with parseAmount: positive, at most 2 decimals, in the quote's currency. */
function typedPrice(text: string): CustomPriceCheck {
  const amount = parseAmount(text);
  return amount === null ? { ok: false } : { ok: true, body: { customPrice: amount } };
}

/** Off = today's body (no customPrice key); on = the typed price, or not ok. Pure. */
export function checkCustomPrice(on: boolean, text: string): CustomPriceCheck {
  return on ? typedPrice(text) : OFF;
}
