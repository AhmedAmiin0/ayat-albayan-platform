import { type FinanceTotalsRow, sourceKey } from './finance.schemas';
import type { FinanceCardFacts } from './finance.types';

type Collect = (facts: FinanceCardFacts, row: FinanceTotalsRow) => void;

const money = ({ amount, currency, month }: FinanceTotalsRow) => ({ amount, currency, month });

// A cost row is one source's share of its lessons, already split in SQL, so it has one source.
const COLLECT: Record<FinanceTotalsRow['kind'], Collect> = {
  payment: (f, r) => f.payments.push({ ...money(r), source: sourceKey.parse(r.key) }),
  cost: (f, r) => f.costs.push({ ...money(r), sources: [sourceKey.parse(r.key)] }),
  expense: (f, r) => f.expenses.push({ ...money(r), category: r.key }),
  unrated: (f, r) => {
    f.unrated += r.n;
  },
};

export function cardFacts(rows: readonly FinanceTotalsRow[]): FinanceCardFacts {
  const facts: FinanceCardFacts = { payments: [], costs: [], expenses: [], unrated: 0 };
  for (const row of rows) COLLECT[row.kind](facts, row);
  return facts;
}

/** Every currency the facts are in (to read only the rates needed). */
export function currenciesOf(...lists: readonly (readonly { currency: string }[])[]): Set<string> {
  return new Set(lists.flatMap((l) => l.map((m) => m.currency)));
}
