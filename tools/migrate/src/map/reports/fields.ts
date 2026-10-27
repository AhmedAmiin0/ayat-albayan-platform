// «تقرير الحلقة» form cells → lesson_reports columns (grades, texts) and lesson facts. Pure.
import { normalizeArabic } from '@ab/shared';
import { text } from '../../sources/sheets/cells.ts';
import { grade, teacherFromText } from '../../sources/values.ts';
import type { Cell, ColumnValue } from '../../types.ts';

const GRADE_FIELDS = [
  'grade_recitation',
  'grade_memorization',
  'grade_revision',
  'grade_tajweed',
  'grade_engagement',
  'grade_commitment',
  'grade_overall',
] as const;
export const TEXT_FIELDS = [
  'recited',
  'new_memorization',
  'revision',
  'theory',
  'notes',
  'homework',
  'next_plan',
] as const;

/** grade() plus the form's «يحتاج إلى مراجعة» spelling of needs_review. */
function gradeOf(raw: string | null) {
  return grade(raw) ?? grade(raw ? raw.replace(/\s+إلى\s+/, ' ') : null);
}

export interface Body {
  columns: Record<string, ColumnValue>;
  /** Grade fields whose text maps to no grade (left null, warned). */
  unmapped: string[];
}

export function reportBody(f: Record<string, Cell>): Body {
  const columns: Record<string, ColumnValue> = {};
  const unmapped: string[] = [];
  for (const k of TEXT_FIELDS) columns[k] = text(f[k]);
  for (const k of GRADE_FIELDS) {
    const raw = text(f[k]);
    const g = gradeOf(raw) ?? null;
    if (raw && !g) unmapped.push(k);
    columns[k] = g;
  }
  return { columns, unmapped };
}

/**
 * Teacher of a report row: the registry slug when the row is linked («المعلم (من السجل)»), else
 * the locked name, else the typed name (A3 aliases). null = a city or junk; undefined = unknown.
 */
export function reportTeacher(f: Record<string, Cell>): string | null | undefined {
  for (const k of ['teacher_slug', 'teacher_locked', 'teacher']) {
    const raw = text(f[k]);
    if (raw) return teacherFromText(raw);
  }
  return undefined;
}

/** Every spelling of the student on the row: as the registry knows it first, then as typed. */
export function reportNames(f: Record<string, Cell>): string[] {
  return ['student_registry_name', 'student_locked', 'student_name']
    .map((k) => text(f[k]))
    .filter((s): s is string => s !== null);
}

/** Free trial lesson: «التجريبيه» as lesson number (A5 text) or a «(تجريبية)» send log. */
export function isTrial(f: Record<string, Cell>): boolean {
  const n = normalizeArabic(text(f['lesson_number_text']) ?? '');
  return /تجريب/.test(n) || /تجريبية/.test(text(f['send_status']) ?? '');
}

/**
 * A5 «رقم الحلقة» free text («الحلقه الثالثه» ~ «الثالثة»), normalized for comparing two reports
 * of one day only — never imported (the number is derived from completed lessons).
 */
export function lessonNumber(f: Record<string, Cell>): string {
  return normalizeArabic(text(f['lesson_number_text']) ?? '')
    .replace(/^(?:ال)?حلقه\s*/, '')
    .trim();
}

/** The PDF reached WhatsApp: «اتبعت PDF ✅ …» or the template fallback «… → اتبعت ✅ …». */
export function wasSent(f: Record<string, Cell>): boolean {
  return (text(f['send_status']) ?? '').includes('✅');
}

/** Lesson outcome from attendance — the same derivation as submit_report (migration 131). */
export const LESSON_STATUS = {
  on_time: 'completed',
  late: 'late',
  excused: 'excused',
  absent: 'no_show',
} as const;
