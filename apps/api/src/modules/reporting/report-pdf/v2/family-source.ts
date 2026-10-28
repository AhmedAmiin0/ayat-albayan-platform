import { reportContentSchema, type ReportContent, type SurahRange } from '@ab/shared';
import type { Db } from '../../../../common/db/db.module';

/** What the v2 family report reads beyond the v1 source (form_version 2 only). */
export interface FamilyExtras {
  content: ReportContent;
  /** Every range of the student's other submitted v2 reports up to this one (juz progress). */
  history: SurahRange[];
  /** The student's next open lesson after this one, if booked. */
  nextLessonAt: string | null;
}

type V2Report = { id: string; student_id: string; content: unknown; submitted_at: string | null };

const OPEN = ['scheduled', 'confirmed'] as const;

const contentOf = (raw: unknown): ReportContent => {
  const parsed = reportContentSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : reportContentSchema.parse({});
};

/**
 * Two small reads (a handful of reports a day): the student's v2 history for the juz progress
 * (v1 reports are never read) and the next booked lesson for «الحلقة القادمة».
 */
export async function loadFamilyExtras(db: Db, report: V2Report, startsAt: string): Promise<FamilyExtras> {
  let history = db
    .from('lesson_reports')
    .select('content')
    .eq('student_id', report.student_id)
    .eq('form_version', 2)
    .eq('status', 'submitted')
    .neq('id', report.id);
  if (report.submitted_at) history = history.lte('submitted_at', report.submitted_at);
  const [past, next] = await Promise.all([
    history,
    db
      .from('lessons')
      .select('starts_at, lesson_students!inner(student_id)')
      .eq('lesson_students.student_id', report.student_id)
      .gt('starts_at', startsAt)
      .in('status', [...OPEN])
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (past.error) throw new Error(`v2 history read failed: ${past.error.message}`);
  if (next.error) throw new Error(`next lesson read failed: ${next.error.message}`);
  return {
    content: contentOf(report.content),
    history: past.data.flatMap((r) => contentOf(r.content).segments),
    nextLessonAt: next.data?.starts_at ?? null,
  };
}
