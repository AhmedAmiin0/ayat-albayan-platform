import {
  ASSISTANT_COMMISSION_STATUSES,
  assistantStatementPaySchema,
  assistantStatementsQuery,
  instant,
  teacherReceiptUploadSchema,
} from '@ab/shared';
import { z } from 'zod';

/** GET /assistant-pay/commissions: the ledger of every assistant, narrowed by assistant, status and when earned. */
export const commissionsQuery = z.object({
  assistantId: z.uuid().optional(),
  status: z.enum(ASSISTANT_COMMISSION_STATUSES).optional(),
  from: instant.optional(),
  to: instant.optional(),
});

/** POST /assistant-pay/receipt-upload-url: the receipt of a statement's payment (the same files as teacher receipts). */
export const assistantReceiptUploadSchema = teacherReceiptUploadSchema.extend({ assistantId: z.uuid() });

export type StatementsQuery = z.output<typeof assistantStatementsQuery>;
export type StatementPay = z.output<typeof assistantStatementPaySchema>;
export type CommissionsQuery = z.output<typeof commissionsQuery>;
