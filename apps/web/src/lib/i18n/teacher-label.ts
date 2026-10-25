import { teacherName } from '@ab/shared';
import { locale } from './locale';

/** A teacher's name in the UI language (English name when the English UI has one). */
export const teacherLabel = (teacher: { display_name_ar: string; display_name_en?: string | null }): string =>
  teacherName(teacher, locale);
