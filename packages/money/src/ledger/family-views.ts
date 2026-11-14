// The family's money responses (docs/50 §5): reductions of the staff views in views.ts.

/**
 * The family's reading of GET /students/:id/balance (docs/50 §5): lesson counts over the live
 * packages and what is still owed; never the price, the quote, fx, invoices or anyone's pay.
 */
export interface FamilyBalanceView {
  student_id: string;
  remaining: number;
  lessons_total: number;
  lessons_used: number;
  /** null without a package. */
  amount_due: { amount: number; currency: string } | null;
}
