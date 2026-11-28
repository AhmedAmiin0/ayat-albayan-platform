import { ALL_PAYMENT_METHODS, PAYOUT_STATUSES } from '@ab/catalog';
import { z } from 'zod';
import { ASSISTANT_COMMISSION_KINDS } from './kind';
import { statementLineKindSchema } from './statement';

export const currencyTotalsSchema = z.object({
  salary: z.number(),
  commissions: z.number(),
  adjustments: z.number(),
  total: z.number(),
});

export const assistantStatementLineViewSchema = z.object({
  kind: statementLineKindSchema,
  amount: z.number(),
  currency: z.string(),
  /** Commission lines: the student; adjustment lines: the reason. */
  student: z.object({ code: z.string(), name: z.string() }).nullable(),
  /** Commission lines: commission or renewal commission; null on the other lines. */
  commission_kind: z.enum(ASSISTANT_COMMISSION_KINDS).nullable(),
  reason: z.string().nullable(),
});

/** GET /assistant-pay/statements rows and details; a salesperson's own in /sales/me/earnings. */
export const assistantStatementViewSchema = z.object({
  id: z.string(),
  assistant: z.object({ id: z.string(), name: z.string() }),
  month: z.string(),
  status: z.enum(PAYOUT_STATUSES),
  /** Frozen with the statement, per currency. */
  totals: z.record(z.string(), currencyTotalsSchema),
  lines: z.array(assistantStatementLineViewSchema),
  approved_at: z.string().nullable(),
  paid_at: z.string().nullable(),
  method: z.enum(ALL_PAYMENT_METHODS).nullable(),
  note: z.string().nullable(),
  has_receipt: z.boolean(),
});

export const assistantStatementListSchema = z.array(assistantStatementViewSchema);

export type AssistantStatementLineView = z.infer<typeof assistantStatementLineViewSchema>;
export type AssistantStatementView = z.infer<typeof assistantStatementViewSchema>;
