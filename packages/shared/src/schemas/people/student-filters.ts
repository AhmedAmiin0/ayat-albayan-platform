import { z } from 'zod';
import { PROGRAMS, STUDENT_STATUSES, type StudentStatus } from '../../enums/index.js';

/** «الباقة» filter: a valid package, none (or exhausted), low balance, newest package unpaid. */
export const STUDENT_PACKAGE_FILTERS = ['active', 'none', 'low', 'unpaid'] as const;
export type StudentPackageFilter = (typeof STUDENT_PACKAGE_FILTERS)[number];
export const STUDENT_WEEKLY_FILTERS = ['yes', 'no'] as const;
export type StudentWeeklyFilter = (typeof STUDENT_WEEKLY_FILTERS)[number];
/** teacher=none → students without a teacher («بدون معلم»). */
export const NO_TEACHER = 'none';

const blank = (v: unknown) => (v === '' || v === null ? undefined : v);

/** «trial,active» (URL / query string) or an array → unique known statuses; else undefined. */
export function parseStatusList(v: unknown): StudentStatus[] | undefined {
  const parts = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  const known = STUDENT_STATUSES.filter((s) => parts.some((p) => String(p).trim() === s));
  return known.length > 0 ? known : undefined;
}

/**
 * Filters of GET /students (R-STU-01). The same names are the /admin/students URL params, so the
 * web forwards them as they are. Every field optional; blanks mean "not filtered".
 */
export const studentListFiltersSchema = z.object({
  status: z.preprocess(parseStatusList, z.array(z.enum(STUDENT_STATUSES)).optional()),
  teacher: z.preprocess(blank, z.union([z.literal(NO_TEACHER), z.guid()]).optional()),
  program: z.preprocess(blank, z.enum(PROGRAMS).optional()),
  package: z.preprocess(blank, z.enum(STUDENT_PACKAGE_FILTERS).optional()),
  weekly: z.preprocess(blank, z.enum(STUDENT_WEEKLY_FILTERS).optional()),
  tz: z.preprocess(blank, z.string().trim().min(1).max(64).optional()),
});
export type StudentListFilters = z.output<typeof studentListFiltersSchema>;
export const STUDENT_FILTER_KEYS = ['status', 'teacher', 'program', 'package', 'weekly', 'tz'] as const;
