import type { assistantStatementPaySchema, assistantStatementsQuery } from '@ab/money';
import type { commissionsQuery } from '@ab/shared';
import type { z } from 'zod';

export type StatementsQuery = z.output<typeof assistantStatementsQuery>;
export type StatementPay = z.output<typeof assistantStatementPaySchema>;
export type CommissionsQuery = z.output<typeof commissionsQuery>;
