import { z } from 'zod';
import { currencyIso, moneyAmount, monthParam, payoutPaySchema } from '../money/index.js';
import { voidReasonSchema } from '../money/corrections-schemas.js';
import { ASSISTANT_COMMISSION_TYPES } from './commission.js';
import { PAYOUT_STATUSES } from '../enums/index.js';
import { instant, localDate } from '../schemas/lessons/scheduling.js';

// Assistant (base role sales) pay commands (owner, 2026-10-06). camelCase like every command. The admin
// sets the terms; nobody types a commission amount: it is computed from the terms (computeCommission).

const commissionTerms = z
  .object({
    type: z.enum(ASSISTANT_COMMISSION_TYPES),
    /** percent: 0-100 points; fixed: an amount in `currency`. */
    value: z.number().positive().max(9_999_999_999).refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'too_many_decimals'),
    currency: currencyIso.nullish(),
    /** No retroactive commission: only subscriptions fully paid on or after this day earn one. A new part cannot start in the past and a saved day cannot move earlier (termStartError). */
    startsOn: localDate,
  })
  .refine((t) => (t.type === 'fixed' ? !!t.currency : !t.currency), { message: 'currency_fixed_only', path: ['currency'] })
  .refine((t) => t.type === 'fixed' || t.value <= 100, { message: 'percent_max_100', path: ['value'] });

const salaryTerms = z.object({ amount: moneyAmount, currency: currencyIso, startsOn: localDate });

/** PUT /assistant-pay/terms/:assistantId: both parts are replaced; null clears one. */
export const assistantTermsSchema = z.object({ commission: commissionTerms.nullable(), salary: salaryTerms.nullable() });

/** POST /assistant-pay/brought-by: one student or many (bulk), assistantId null clears it. */
export const broughtBySchema = z.object({
  studentIds: z.array(z.uuid()).min(1).max(500),
  assistantId: z.uuid().nullable(),
  /** When they were brought; omitted = now (or unchanged for the same assistant). */
  broughtAt: instant.optional(),
});

/** POST /assistant-pay/statements: builds or rebuilds the DRAFT of that month. */
export const assistantStatementGenerateSchema = z.object({ assistantId: z.uuid(), month: monthParam });

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
    .refine((v) => v !== 0 && Math.abs(v) <= 9_999_999_999 && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'invalid_amount'),
  currency: currencyIso,
  reason: z.string().trim().min(3, 'reason_required').max(500),
  /** Idempotency key (rule 8): the client makes one per submit and repeats it on a retry; a repeat returns the first row. */
  requestId: z.uuid().optional(),
});

/** POST /assistant-pay/statements/:id/pay: the payout's body (paidAt, method, note, receiptPath). */
export const assistantStatementPaySchema = payoutPaySchema;
/** POST /assistant-pay/statements/:id/unpay and /assistant-pay/commissions/:id/void. */
export const assistantReasonSchema = voidReasonSchema;

export type AssistantTermsInput = z.output<typeof assistantTermsSchema>;
export type BroughtByInput = z.output<typeof broughtBySchema>;
export type AssistantStatementGenerate = z.output<typeof assistantStatementGenerateSchema>;
export type AssistantAdjustmentInput = z.output<typeof assistantAdjustmentSchema>;
