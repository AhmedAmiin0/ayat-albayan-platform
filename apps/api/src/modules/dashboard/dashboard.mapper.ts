import {
  LEAD_SOURCES,
  OCCUPYING_LESSON_STATUSES,
  type DashboardSummary,
  type LeadSource,
  type LeadStatus,
  type LessonStatus,
  type SourceRow,
} from '@ab/shared';
import { round2 } from './work/conversion';
import type { SourceKey } from './dashboard.types';
import type { SourceMoney } from './finance/finance';

// Pure shaping of the dashboard counts: each number is a count of statuses (R-RPT-01, issue F3).

/** How many of `values` per key, every key present (0 when none). */
export function countBy<K extends string>(keys: readonly K[], values: Iterable<K>): Record<K, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const v of values) if (v in out) out[v] += 1;
  return out;
}

export interface LoadInput {
  teachers: readonly { id: string; display_name_ar: string; max_students: number | null }[];
  lessons: readonly { status: LessonStatus; teacher_id: string }[];
  students: readonly { teacher_id: string | null }[];
}

/** Per active teacher: occupying lessons in the range and assigned trial/active students. */
export function teacherLoad({ teachers, lessons, students }: LoadInput): DashboardSummary['teacher_load'] {
  const occupying: readonly LessonStatus[] = OCCUPYING_LESSON_STATUSES;
  const tally = (ids: Iterable<string | null>) => {
    const m = new Map<string, number>();
    for (const id of ids) if (id) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  };
  const lessonsBy = tally(lessons.filter((l) => occupying.includes(l.status)).map((l) => l.teacher_id));
  const studentsBy = tally(students.map((s) => s.teacher_id));
  return teachers.map((t) => ({
    teacher_id: t.id,
    display_name_ar: t.display_name_ar,
    lessons: lessonsBy.get(t.id) ?? 0,
    students: studentsBy.get(t.id) ?? 0,
    max_students: t.max_students,
  }));
}

const SOURCE_KEYS: readonly SourceKey[] = [...LEAD_SOURCES, 'unknown'];

/**
 * R-RPT-02 attribution: leads and converted leads per lead source (created in the range), money
 * per the payer's guardian source. `unknown` (a guardian without a source) only when it has money.
 */
export function sourceRows(
  leads: readonly { source: LeadSource; status: LeadStatus }[],
  money: SourceMoney,
): SourceRow[] {
  return SOURCE_KEYS.flatMap((source) => {
    const of = leads.filter((l) => l.source === source);
    const m = money.get(source) ?? { revenue: 0, teacher_cost: 0 };
    if (source === 'unknown' && m.revenue === 0 && m.teacher_cost === 0) return [];
    return [
      {
        source,
        leads: of.length,
        converted: of.filter((l) => l.status === 'converted').length,
        revenue: round2(m.revenue),
        teacher_cost: round2(m.teacher_cost),
        gross_margin: round2(m.revenue - m.teacher_cost),
      },
    ];
  });
}
