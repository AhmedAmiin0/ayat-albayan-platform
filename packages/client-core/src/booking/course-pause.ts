import { counted, type CoursePauseView, type PluralForm } from '@ab/shared';
import { ApiError } from '../http/index.js';

// «إيقاف الدورة مؤقتًا» (owner 2026-10-28, docs/11 §7b) for web and mobile: the API paths, the query key and the
// sheet's / banner's lines. The words are injected (each app's `t.coursePause`); dates arrive already formatted.

const base = (studentId: string): string => `/students/${studentId}/course-pause`;

/** GET (state) and POST (start). */
export const coursePausePath = base;
export const coursePauseResumePath = (studentId: string): string => `${base(studentId)}/resume`;
export const coursePauseUntilPath = (studentId: string): string => `${base(studentId)}/until`;

/** GET …/preview?from=&until= (until empty = open-ended). */
export function coursePausePreviewPath(input: { studentId: string; from: string; until: string | null }): string {
  const q = new URLSearchParams({ from: input.from });
  if (input.until) q.set('until', input.until);
  return `${base(input.studentId)}/preview?${q.toString()}`;
}

/** The query key of a student's pause state (invalidate it with the student's file after a write). */
export const coursePauseKey = (studentId: string): readonly ['course-pause', string] => ['course-pause', studentId];

/** `t.coursePause.preview`: a zero line and the four Arabic count forms. */
export type PreviewWords = Readonly<Record<PluralForm | 'zero', string>>;

/** «ستُلغى N حلقات، وتُمدَّد الباقة بعدد أيام الإيقاف». */
export function coursePausePreviewText(words: PreviewWords, lessons: number): string {
  return lessons === 0 ? words.zero : counted(words, lessons);
}

export interface BannerWords {
  bannerUntil: string;
  bannerOpen: string;
  bannerFrom: string;
}

/** «الدورة موقوفة مؤقتًا حتى …» (or «حتى الاستئناف»), and «يبدأ الإيقاف في …» while it has not started. */
export function coursePauseBanner(input: {
  pause: Pick<CoursePauseView, 'from_date' | 'until_date'>;
  today: string;
  words: BannerWords;
  formatDate: (date: string) => string;
}): { title: string; starts: string | null } {
  const { pause, words, formatDate } = input;
  const title = pause.until_date === null ? words.bannerOpen : words.bannerUntil.replace('{date}', formatDate(pause.until_date));
  const starts = pause.from_date > input.today ? words.bannerFrom.replace('{date}', formatDate(pause.from_date)) : null;
  return { title, starts };
}

const CODES = ['date_in_past', 'invalid_range', 'already_paused', 'pause_not_open', 'student_not_found'] as const;
export type CoursePauseErrorCode = (typeof CODES)[number] | 'generic';

/** The `t.coursePause.errors` key of a failed write. */
export function coursePauseErrorCode(error: unknown): CoursePauseErrorCode {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return 'generic';
  const code = 'code' in error.body ? error.body.code : undefined;
  return CODES.find((c) => c === code) ?? 'generic';
}
