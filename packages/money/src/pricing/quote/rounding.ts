import { DEFAULT_ROUNDING, type Rounding } from './rounding.schemas';

/**
 * Up and down read the amount in cents: 90 × (1 − 70 %) is 27.000000000000004 and
 * 90 × (1 − 30 %) is 62.99999999999999, and neither may gain or lose a whole unit.
 */
const cents = (amount: number): number => Math.round(amount * 100) / 100;

/**
 * Nearest stays Math.round on the raw product, the calculator's rule (docs/08 §3): through cents
 * 40.49999999999999 would become 41 and change prices already quoted.
 */
const ROUND: Readonly<Record<Rounding, (amount: number) => number>> = {
  nearest: Math.round,
  up: (amount) => Math.ceil(cents(amount)),
  down: (amount) => Math.floor(cents(amount)),
};

/** A discounted amount as a whole currency unit. */
export function roundPrice(amount: number, mode: Rounding = DEFAULT_ROUNDING): number {
  return ROUND[mode](amount);
}
