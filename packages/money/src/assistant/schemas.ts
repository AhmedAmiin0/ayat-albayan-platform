import { z } from 'zod';
import { hasTwoDecimals, instant, localDate } from '@ab/core';
import { currencyIso, moneyAmount, monthParam, payoutPaySchema } from '../ledger';
import { voidReasonSchema } from '../ledger/corrections-schemas';
import { ASSISTANT_COMMISSION_STATUSES, ASSISTANT_COMMISSION_TYPES } from './commission';
import { ASSISTANT_COMMISSION_KINDS } from './kind';
import { PAYOUT_STATUSES } from '@ab/catalog';

// Assistant (base role sales) pay commands, camelCase like every command. The admin sets the terms;
// nobody types a commission amount: it is computed from the terms (computeCommission).

const commissionTerms = z
  .object({
    type: z.enum(ASSISTANT_COMMISSION_TYPES),
    /** percent: 0-100 points; fixed: an amount in `currency`. */
    value: z.number().positive().max(9_999_999_999).refine(hasTwoDecimals, 'too_many_decimals'),
    currency: currencyIso.nullish(),
    /**
     * No retroactive commission: only subscriptions fully paid on or after this day earn one. A new
     * part cannot start in the past and a saved day cannot move earlier (termStartError).
     */
    startsOn: localDate,
  })
  .refine((t) => (t.type === 'fixed' ? !!t.currency : !t.currency), { message: 'currency_fixed_only', path: ['currency'] })
  .refine((t) => t.type === 'fixed' || t.value <= 100, { message: 'percent_max_100', path: ['value'] });

const salaryTerms = z.object({ amount: moneyAmount, currency: currencyIso, startsOn: localDate });

/** PUT /assistant-pay/terms/:assistantId: both parts are replaced; null clears one. */
export const assistantTermsSchema = z.object({
  commission: commissionTerms.nullable(),
  salary: salaryTerms.nullable(),
});

/** POST /assistant-pay/brought-by: one student or many (bulk), assistantId null clears it. */
export const broughtBySchema = z.object({
  studentIds: z.array(z.uuid()).min(1).max(500),
  assistantId: z.uuid().nullable(),
  /** When they were brought; omitted = now (or unchanged for the same assistant). */
  broughtAt: instant.optional(),
});

/** POST /assistant-pay/statements: builds or rebuilds the DRAFT of that month. */
export const assistantStatementGenerateSchema = z.object({
  assistantId: z.uuid(),
  month: monthParam,
});

/** GET /assistant-pay/statements. */
export const assistantStatementsQuery = z.object({
  assistantId: z.uuid().optional(),
  month: monthParam.optional(),
  status: z.enum(PAYOUT_STATUSES).optional(),
});

/** POST /assistant-pay/adjustments: a manual +/- carried into the next open statement. */
export const assistantAdjustmentSchema = z.object({
  assistantId: z.uuid(),
  amount: z
    .number()
    .refine((v) => v !== 0 && Math.abs(v) <= 9_999_999_999 && hasTwoDecimals(v), 'invalid_amount'),
  currency: currencyIso,
  reason: z.string().trim().min(3, 'reason_required').max(500),
  /**
   * Idempotency key (rule 8): the client makes one per submit and repeats it on a retry; a repeat
   * returns the first row.
   */
  requestId: z.uuid().optional(),
});

/** POST /assistant-pay/statements/:id/pay: the payout body (paidAt, method, note, receiptPath). */
export const assistantStatementPaySchema = payoutPaySchema;
/** POST /assistant-pay/statements/:id/unpay and /assistant-pay/commissions/:id/void. */
export const assistantReasonSchema = voidReasonSchema;

export type AssistantTermsInput = z.output<typeof assistantTermsSchema>;
export type BroughtByInput = z.output<typeof broughtBySchema>;
export type AssistantStatementGenerate = z.output<typeof assistantStatementGenerateSchema>;
export type AssistantAdjustmentInput = z.output<typeof assistantAdjustmentSchema>;

const person = z.object({ id: z.string(), name: z.string() });

/** GET /assistant-pay/terms/:assistantId and the `terms` of /sales/me/earnings. */
export const assistantTermsViewSchema = z.object({
  assistant_id: z.string(),
  commission: z
    .object({
      type: z.enum(ASSISTANT_COMMISSION_TYPES),
      value: z.number(),
      currency: z.string().nullable(),
      starts_on: z.string(),
    })
    .nullable(),
  salary: z.object({ amount: z.number(), currency: z.string(), starts_on: z.string() }).nullable(),
  /** Renewal commission share now; 0 while renewal commission is off (renewalShareNow). */
  renewal_share_percent: z.number(),
});

/** GET /assistant-pay/terms: every assistant, both parts null until an admin sets them. */
export const assistantTermsListSchema = z.array(
  assistantTermsViewSchema.extend({ name: z.string() }),
);

/** GET /assistant-pay/brought-by/:studentId: both null when nobody brought the student. */
export const broughtByViewSchema = z.object({
  assistant: person.nullable(),
  brought_at: z.string().nullable(),
});

export const broughtByResultSchema = z.object({ changed: z.number() });

/** GET /assistant-pay/commissions: the admin ledger of every assistant. */
export const assistantCommissionViewSchema = z.object({
  id: z.string(),
  assistant: person,
  student: person.extend({ code: z.string() }),
  subscription_id: z.string().nullable(),
  kind: z.enum(ASSISTANT_COMMISSION_KINDS),
  /** 100 for a first commission, the renewal share at earn time for a renewal. */
  share_percent: z.number(),
  type: z.enum(ASSISTANT_COMMISSION_TYPES),
  /** The term's value when it was earned: percent points, or the fixed amount. */
  rate: z.number(),
  base_amount: z.number(),
  base_currency: z.string(),
  amount: z.number(),
  currency: z.string(),
  earned_at: z.string(),
  status: z.enum(ASSISTANT_COMMISSION_STATUSES),
  void_reason: z.string().nullable(),
  voided_at: z.string().nullable(),
  statement_id: z.string().nullable(),
});

export const assistantCommissionListSchema = z.array(assistantCommissionViewSchema);

export type AssistantTermsView = z.infer<typeof assistantTermsViewSchema>;
export type AssistantTermsRow = z.infer<typeof assistantTermsListSchema>[number];
export type BroughtByView = z.infer<typeof broughtByViewSchema>;
export type BroughtByResult = z.infer<typeof broughtByResultSchema>;
export type AssistantCommissionView = z.infer<typeof assistantCommissionViewSchema>;
