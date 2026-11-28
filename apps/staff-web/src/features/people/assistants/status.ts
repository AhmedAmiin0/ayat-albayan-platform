import { t } from '@ab/web-kit';
import { apiErrorText } from '@/features/finance/subscriptions';

/** Earned is settled money (fill); voided is struck, in the danger tone (docs/27 E6). */
export { commissionStatusStyle } from '@ab/money';

/** The API's P0001 codes and the schema's messages, in Arabic. */
export const errorText = (e: unknown): string => apiErrorText(e, { ...t.assistants.error });

/** Unknown keys fall back to a generic check-this-value message. */
export function fieldError(key: string | undefined): string | undefined {
  if (key === undefined) return undefined;
  const table: Record<string, string> = { ...t.assistants.error };
  return table[key] ?? t.assistants.error.invalid;
}
