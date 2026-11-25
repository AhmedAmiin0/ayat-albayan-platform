import { LEAD_SOURCES } from '@ab/catalog';
import { z } from 'zod';

/** One grouped row of finance_card_totals (migration 20261125000100). */
export const financeTotalsRow = z.object({
  kind: z.enum(['payment', 'cost', 'expense', 'unrated']),
  month: z.string(),
  currency: z.string(),
  key: z.string(),
  amount: z.coerce.number(),
  n: z.coerce.number().int(),
});
export const financeTotalsRows = z.array(financeTotalsRow);
export type FinanceTotalsRow = z.infer<typeof financeTotalsRow>;

/** A guardian source the catalogue does not know is booked as unknown, as a missing one is. */
export const sourceKey = z.enum([...LEAD_SOURCES, 'unknown']).catch('unknown');
