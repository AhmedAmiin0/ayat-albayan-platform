import { ApiError } from '@/core/lib/http/api';
import type { ClockCycle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { riyadhTime } from '@/today/lib/lesson-text';

const errors: Record<string, string | undefined> = t.classroom.error;

/** The line for a refused join: the API's `code` in words, else «unknown». */
export function joinError(error: unknown): string {
  const body = error instanceof ApiError ? error.body : null;
  const code =
    typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : undefined;
  return (typeof code === 'string' ? errors[code] : undefined) ?? errors['unknown'] ?? t.common.error;
}

/** «بتفتح الساعة 15:45», on the Riyadh clock like the row's own time. */
export const opensAtLine = (opensAt: string, cycle: ClockCycle): string =>
  t.classroom.opensAt.replace('{time}', riyadhTime(opensAt, cycle));
