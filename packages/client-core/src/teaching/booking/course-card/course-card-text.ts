import type { CourseCardView } from '@ab/shared';
import { counted, type PluralForm } from '@ab/core';

// Every action previews what will happen and shows the result after; words are injected.

export type CountWords = Readonly<Record<PluralForm | 'zero', string>>;
/** The zero form, else the plural form of n. */
export const count = (words: CountWords, n: number): string =>
  n === 0 ? words.zero : counted(words, n);
export const fill = (text: string, key: string, value: string): string => text.split(`{${key}}`).join(value);

export const datesText = (instants: readonly string[], day: (instant: string) => string): string =>
  instants.map(day).join('، ');

export interface CardWords {
  teacherEnd: string;
  /** Used when no teacher is known. */
  endsOn: string;
  unbooked: CountWords;
}

interface CardLineInput {
  course: NonNullable<CourseCardView['course']>;
  words: CardWords;
  /** A local date "YYYY-MM-DD" in words. */
  date: (local: string) => string;
}

/** The unbooked line is null when none are left. */
export function courseCardLines({ course, words, date }: CardLineInput): {
  teacher: string;
  unbooked: string | null;
} {
  const end = date(course.endsOn);
  const teacher = course.teacherName
    ? fill(fill(words.teacherEnd, 'teacher', course.teacherName), 'date', end)
    : fill(words.endsOn, 'date', end);
  const unbooked = course.unbooked > 0 ? count(words.unbooked, course.unbooked) : null;
  return { teacher, unbooked };
}

export interface PreviewWords {
  cancels: CountWords;
  extendDays: CountWords;
  /** Open-ended pause: the package is extended by the number of paused days. */
  extendOpen: string;
}

/** Pause preview: the cancelled lessons with their dates and the package's extension. */
export function pausePreviewLines(input: {
  preview: { lessons: number; starts?: string[]; extend_days?: number | null };
  words: PreviewWords;
  day: (instant: string) => string;
}): string[] {
  const { preview, words, day } = input;
  const cancels = fill(count(words.cancels, preview.lessons), 'dates', datesText(preview.starts ?? [], day));
  const days = preview.extend_days;
  const extend = days == null ? words.extendOpen : count(words.extendDays, days);
  return [cancels, extend];
}

export interface ResumeWords {
  back: CountWords;
  /** Zero means the pause has not started, so the package is not extended. */
  extendDays: CountWords;
}

export function resumePreviewLines(input: {
  preview: { back: string[]; extendDays: number };
  words: ResumeWords;
  day: (instant: string) => string;
}): string[] {
  const { preview, words, day } = input;
  const back = fill(count(words.back, preview.back.length), 'dates', datesText(preview.back, day));
  return [back, count(words.extendDays, preview.extendDays)];
}

export interface ExtendWords {
  books: CountWords;
  endsOn: string;
}

export function extendPreviewLines(input: {
  preview: { starts: string[]; endsOn: string | null };
  words: ExtendWords;
  format: { day: (instant: string) => string; date: (local: string) => string };
}): string[] {
  const { preview, words, format } = input;
  const books = fill(count(words.books, preview.starts.length), 'dates', datesText(preview.starts, format.day));
  const end = preview.endsOn ? [fill(words.endsOn, 'date', format.date(preview.endsOn))] : [];
  return [books, ...end];
}

export interface ExtendDoneWords {
  done: CountWords;
  endsOn: string;
  /** Some new lessons clash (stored on them, never blocking). */
  clashes: string;
}

/** The clashes line appears only when some lessons clashed. */
export function extendDoneLines(input: {
  result: { inserted: number; endsOn: string | null; conflicts: number };
  words: ExtendDoneWords;
  date: (local: string) => string;
}): string[] {
  const { result, words, date } = input;
  const end = result.endsOn ? [fill(words.endsOn, 'date', date(result.endsOn))] : [];
  const clashes = result.conflicts > 0 ? [words.clashes] : [];
  return [count(words.done, result.inserted), ...end, ...clashes];
}
