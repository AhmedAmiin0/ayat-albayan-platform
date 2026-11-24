import type { CourseCardView } from '@ab/shared';
import { counted, type PluralForm } from '@ab/core';

// The lines of «الدورة والباقة» and of each action's preview (owner 2026-11-17: «every action
// previews what will happen … and shows the result after»), for web and mobile. Words and the
// date formats are injected (each app's `t.courseCard`, its own day labels).

export type CountWords = Readonly<Record<PluralForm | 'zero', string>>;
/** The zero form, else the plural form of n. */
export const count = (words: CountWords, n: number): string =>
  n === 0 ? words.zero : counted(words, n);
export const fill = (text: string, key: string, value: string): string => text.split(`{${key}}`).join(value);

/** The day labels of these instants, joined («الأحد 22 نوفمبر، الثلاثاء 24 نوفمبر»). */
export const datesText = (instants: readonly string[], day: (instant: string) => string): string =>
  instants.map(day).join('، ');

export interface CardWords {
  /** «{teacher} · آخر حلقة في {date}». */
  teacherEnd: string;
  /** «آخر حلقة في {date}» (no teacher known). */
  endsOn: string;
  /** «بقيت حلقتان بلا مواعيد» (zero: nothing). */
  unbooked: CountWords;
}

interface CardLineInput {
  course: NonNullable<CourseCardView['course']>;
  words: CardWords;
  /** A local date "YYYY-MM-DD" in words. */
  date: (local: string) => string;
}

/** «فاطمة · آخر حلقة في 24 نوفمبر 2026» and «بقيت حلقتان بلا مواعيد» (null when none). */
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
  /** «ستُلغى حلقتان: {dates}» (zero: «لا توجد حلقات في هذه المدة»). */
  cancels: CountWords;
  /** «عند الاستئناف تُمدَّد الباقة {n} أيام». */
  extendDays: CountWords;
  /** «تُمدَّد الباقة عند الاستئناف بعدد أيام الإيقاف» (open-ended). */
  extendOpen: string;
}

/** «إيقاف مؤقت»'s «ما سيحدث»: the lessons cancelled with their dates, the package's extension. */
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
  /** «تعود الحلقتان: {dates}» (zero: «لا توجد حلقات تعود»). */
  back: CountWords;
  /** «تُمدَّد الباقة {n} أيام» (zero: «الإيقاف لم يبدأ بعد، فلا تُمدَّد الباقة»). */
  extendDays: CountWords;
}

/** «استئناف الدورة الآن؟»: the lessons back with their dates and the days the package moves. */
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
  /** «تُحجز حلقتان على الأيام والمواعيد نفسها: {dates}» (zero: nothing left). */
  books: CountWords;
  /** «آخر حلقة في {date}». */
  endsOn: string;
}

/** «مدّ الجدول حتى نهاية الباقة؟»: the lessons it books and the new last day. */
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
  /** «حُجزت حلقتان» (zero: nothing was left to book). */
  done: CountWords;
  /** «آخر حلقة في {date}». */
  endsOn: string;
  /** Some new lessons clash (stored on them, never blocking). */
  clashes: string;
}

/** After «مدّ الجدول»: what it booked, the new last day, and the clashes line when some. */
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
