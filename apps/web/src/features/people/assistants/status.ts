import { t } from '@/lib/i18n/i18n';
import { apiErrorText } from '@/features/finance/subscriptions';

/** Earned is settled money (fill); voided is struck, in the danger tone: @ab/shared since docs/27 E6. */
export { commissionStatusStyle } from '@ab/shared';

/** The API's P0001 codes and the schema's messages, in Arabic. */
export const errorText = (e: unknown): string => apiErrorText(e, { ...t.assistants.error });

/** A form field's error key (a schema message) → text; unknown keys read «تحقق من هذه القيمة». */
export function fieldError(key: string | undefined): string | undefined {
  if (key === undefined) return undefined;
  const table: Record<string, string> = { ...t.assistants.error };
  return table[key] ?? t.assistants.error.invalid;
}
