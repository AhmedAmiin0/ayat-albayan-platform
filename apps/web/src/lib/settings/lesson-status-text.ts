import { lessonStatusLabel, lessonStatusLook } from '@ab/client-core';
import type { LessonStatus, StatusStyle } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { usePublicConfig } from './public-config';

/** A lesson status as a chip: its look and its words. */
export type LessonStatusChip = StatusStyle & { label: string };

export interface LessonStatusText {
  /** settings.lesson_confirmation_required: «يحتاج تأكيد» exists only while it is on. */
  required: boolean;
  label: (status: LessonStatus) => string;
  chip: (status: LessonStatus) => LessonStatusChip;
}

/** The pure part of useLessonStatusText, for code that already knows the setting. */
export function lessonStatusText(required: boolean): LessonStatusText {
  const words = { labels: t.enums.lessonStatus, upcoming: t.lessons.noConfirm.scheduled };
  const label = (status: LessonStatus): string => lessonStatusLabel(status, required, words);
  return {
    required,
    label,
    chip: (status) => ({ ...lessonStatusLook(status, required), label: label(status) }),
  };
}

/**
 * A lesson status as the academy shows it (owner 2026-11-02): while no confirmation is required a
 * scheduled lesson is simply upcoming («مجدولة», neutral), never «يحتاج تأكيد».
 */
export function useLessonStatusText(): LessonStatusText {
  return lessonStatusText(usePublicConfig().lesson_confirmation_required);
}
