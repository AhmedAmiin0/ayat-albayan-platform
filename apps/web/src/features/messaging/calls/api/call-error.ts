import { callErrorText as errorText } from '@ab/client-core';
import { t } from '@/lib/i18n/i18n';

/** The API's `code` → its sentence (t.calls.errors); anything else is «تعذّر إجراء المكالمة». */
export const callErrorText = (error: unknown): string => errorText(error, t.calls);
