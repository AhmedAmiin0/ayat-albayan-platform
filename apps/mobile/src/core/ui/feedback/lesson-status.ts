import { lessonStatusLabel, lessonStatusLook } from '@ab/client-core';
import type { LessonStatus, StatusStyle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { usePublicConfig } from '@/core/lib/query/public-config';

/**
 * A row chip's words: «To confirm» for the long «Needs confirmation» (owner 2026-10-28: «Needs
 * confirm…» truncated). A detail head with room keeps t.enums.lessonStatus.
 */
const shortLabels: Readonly<Record<LessonStatus, string>> = {
  ...t.enums.lessonStatus,
  ...t.today.statusShort,
};

/** How a lesson status reads on screen, following settings.lesson_confirmation_required. */
export interface LessonStatusText {
  /** The academy asks for a confirmation: «يحتاج تأكيد» and the confirm actions exist. */
  required: boolean;
  /** A row chip's short word («للتأكيد», or «قادمة» when no confirmation is required). */
  word: (status: LessonStatus) => string;
  /** The whole word («يحتاج تأكيد», or «مجدولة»): detail heads, spoken labels. */
  label: (status: LessonStatus) => string;
  /** The chip's tone and glyph: neutral for a scheduled lesson that needs no confirmation. */
  look: (status: LessonStatus) => StatusStyle;
}

/** The words and look for `required` (owner 2026-11-02: OFF, a scheduled lesson is just upcoming). */
export function lessonStatusText(required: boolean): LessonStatusText {
  const short = { labels: shortLabels, upcoming: t.lessons.noConfirm.scheduledShort };
  const long = { labels: t.enums.lessonStatus, upcoming: t.lessons.noConfirm.scheduled };
  return {
    required,
    word: (status) => lessonStatusLabel(status, required, short),
    label: (status) => lessonStatusLabel(status, required, long),
    look: (status) => lessonStatusLook(status, required),
  };
}

/** lessonStatusText for this academy (GET /settings/public; the default, OFF, until it answers). */
export const useLessonStatusText = (): LessonStatusText =>
  lessonStatusText(usePublicConfig().lesson_confirmation_required);
