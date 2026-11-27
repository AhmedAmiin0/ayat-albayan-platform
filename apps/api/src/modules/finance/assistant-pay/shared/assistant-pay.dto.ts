import { teacherReceiptUploadSchema } from '@ab/money';
import type { assistantStatementPaySchema, assistantStatementsQuery } from '@ab/money';
import type { commissionsQuery } from '@ab/shared';
import { z } from 'zod';

/** POST /assistant-pay/receipt-upload-url: the receipt of a statement's payment (the same files as teacher receipts). */
export const assistantReceiptUploadSchema = teacherReceiptUploadSchema.extend({
  assistantId: z.uuid(),
});

export type StatementsQuery = z.output<typeof assistantStatementsQuery>;
export type StatementPay = z.output<typeof assistantStatementPaySchema>;
export type CommissionsQuery = z.output<typeof commissionsQuery>;
