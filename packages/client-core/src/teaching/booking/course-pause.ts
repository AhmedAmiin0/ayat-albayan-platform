import type { CoursePauseView } from '@ab/shared';
import { counted, type PluralForm } from '@ab/core';
import { ApiError } from '../../core/http';

// Course pause (docs/11 §7b) for web and mobile; words are injected and dates arrive formatted.

/**
 * The query key of a student's pause state (invalidate it with the student's file after a write).
 */
export const coursePauseKey = (studentId: string): readonly ['course-pause', string] => [
  'course-pause',
  studentId,
];

/** `t.coursePause.preview`: a zero line and the four Arabic count forms. */
export type PreviewWords = Readonly<Record<PluralForm | 'zero', string>>;

export function coursePausePreviewText(words: PreviewWords, lessons: number): string {
  return lessons === 0 ? words.zero : counted(words, lessons);
}

export interface BannerWords {
  bannerUntil: string;
  bannerOpen: string;
  bannerFrom: string;
}

export function coursePauseBanner(input: {
  pause: Pick<CoursePauseView, 'from_date' | 'until_date'>;
  today: string;
  words: BannerWords;
  formatDate: (date: string) => string;
}): { title: string; starts: string | null } {
  const { pause, words, formatDate } = input;
  const title =
    pause.until_date === null
      ? words.bannerOpen
      : words.bannerUntil.replace('{date}', formatDate(pause.until_date));
  const starts =
    pause.from_date > input.today
      ? words.bannerFrom.replace('{date}', formatDate(pause.from_date))
      : null;
  return { title, starts };
}

const CODES = [
  'date_in_past',
  'invalid_range',
  'already_paused',
  'pause_not_open',
  'student_not_found',
] as const;
export type CoursePauseErrorCode = (typeof CODES)[number] | 'generic';

/** The `t.coursePause.errors` key of a failed write. */
export function coursePauseErrorCode(error: unknown): CoursePauseErrorCode {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null)
    return 'generic';
  const code = 'code' in error.body ? error.body.code : undefined;
  return CODES.find((c) => c === code) ?? 'generic';
}
