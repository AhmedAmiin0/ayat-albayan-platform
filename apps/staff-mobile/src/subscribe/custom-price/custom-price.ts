import { parseAmount } from '@ab/shared';

/** Nothing while the custom amount is off. */
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
