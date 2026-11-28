import { ALL_PAYMENT_METHODS, PAYMENT_KINDS } from '@ab/catalog';
import { z } from 'zod';
import { ASSISTANT_COMMISSION_STATUSES } from './commission';
import { ASSISTANT_COMMISSION_KINDS } from './kind';
import { assistantTermsViewSchema } from './schemas';
import { assistantStatementViewSchema, currencyTotalsSchema } from './statement-view.schemas';
import { WALLET_VOID_REASONS } from './wallet';

// Assistant (base role sales) own pages: snake_case, instants ISO UTC, months YYYY-MM-01.
// Amounts are per currency; nothing here sums across currencies. No price ever leaves.

/** due: no statement or a draft one; in_statement: an approved one; paid: a paid one. */
export const walletStateSchema = z.enum(['due', 'in_statement', 'paid', 'voided']);

/** One currency of the wallet. */
export const walletTotalsSchema = z.object({
  /** Not on a paid statement yet, less unpaid reversals (negative after a paid one is voided). */
  due: z.number(),
  /** On paid statements; a reversal paid back lowers it. */
  paid: z.number(),
  /** Earned this month, in the assistant's time zone. */
  this_month: z.number(),
});

/** GET /sales/me/students: the students this assistant brought, newest first. */
export const myStudentRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  brought_at: z.string(),
  /** The guardian's E.164 phone, null without one; never another contact. */
  guardian_phone: z.string().nullable(),
  /** Has any of their subscriptions been paid in full? (No price, no amounts.) */
  first_subscription_paid: z.boolean(),
  commission: z
    .object({
      amount: z.number(),
      currency: z.string(),
      status: z.enum(ASSISTANT_COMMISSION_STATUSES),
      earned_at: z.string(),
    })
    .nullable(),
  /** Renewal commissions this student earned her (no per-student amounts after the first). */
  renewal_commissions: z.number(),
});

/** GET /sales/me/earnings. */
export const myEarningsSchema = z.object({
  terms: assistantTermsViewSchema.nullable(),
  /** This month so far, as the next statement would be (planStatement), per currency. */
  this_month: z.record(z.string(), currencyTotalsSchema),
  /** All earned commissions per currency, kept for older app builds. */
  commissions_total: z.record(z.string(), z.number()),
  /** The wallet per currency (walletTotals): owed, paid, earned this month; commissions only. */
  wallet: z.record(z.string(), walletTotalsSchema),
  statements: z.array(assistantStatementViewSchema),
});

/** GET /sales/me/commissions rows: mine only, newest first. No price or base amount. */
export const myCommissionRowSchema = z.object({
  id: z.string(),
  student: z.object({ code: z.string(), name: z.string() }),
  kind: z.enum(ASSISTANT_COMMISSION_KINDS),
  /** 100 for a first commission, the renewal share it was earned at for a renewal. */
  share_percent: z.number(),
  amount: z.number(),
  currency: z.string(),
  earned_at: z.string(),
  /** How the package was paid (the payment that completed it); null without one. */
  method: z.enum(ALL_PAYMENT_METHODS).nullable(),
  state: walletStateSchema,
  /** YYYY-MM-01 of the approved or paid statement it sits in; null otherwise. */
  statement_month: z.string().nullable(),
  /** A voided row's system reason; null when an admin voided it by hand. */
  void_reason: z.enum(WALLET_VOID_REASONS).nullable(),
});

/** GET /sales/me/payments: only payments this assistant recorded; no other subscription data. */
export const myPaymentRowSchema = z.object({
  id: z.string(),
  student: z.object({ id: z.string(), code: z.string(), name: z.string() }),
  kind: z.enum(PAYMENT_KINDS),
  amount: z.number(),
  currency: z.string(),
  method: z.enum(ALL_PAYMENT_METHODS),
  paid_at: z.string(),
  note: z.string().nullable(),
});

export type WalletState = z.infer<typeof walletStateSchema>;
export type WalletTotals = z.infer<typeof walletTotalsSchema>;
export type MyStudentRow = z.infer<typeof myStudentRowSchema>;
export type MyEarnings = z.infer<typeof myEarningsSchema>;
export type MyCommissionRow = z.infer<typeof myCommissionRowSchema>;
export type MyPaymentRow = z.infer<typeof myPaymentRowSchema>;
