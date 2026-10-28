import type { LessonStatus } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

const shortStatus: Partial<Record<LessonStatus, string>> = t.today.statusShort;

/**
 * A lesson status in a row's chip: «To confirm» for the long «Needs confirmation» (owner 2026-10-28:
 * «Needs confirm…» truncated). A detail head with room keeps t.enums.lessonStatus.
 */
export function statusWord(status: LessonStatus): string {
  return shortStatus[status] ?? t.enums.lessonStatus[status];
}
