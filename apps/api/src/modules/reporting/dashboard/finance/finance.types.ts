import type { CostFact, ExpenseFact, PaymentFact } from './finance';

export interface Window {
  from: Date;
  to: Date;
}

/** The card's read: the Riyadh window, and its first and last month ("YYYY-MM") for expenses. */
export interface FinanceCardQuery {
  window: Window;
  first: string;
  last: string;
}

export interface FinanceCardFacts {
  payments: PaymentFact[];
  costs: CostFact[];
  expenses: ExpenseFact[];
  /** Payable lessons with no rate: shown as a warning, never costed. */
  unrated: number;
}
