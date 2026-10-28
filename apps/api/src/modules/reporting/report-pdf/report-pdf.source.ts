import type { Attendance, Grade, Program } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import type { SlotPackage } from './render/pdf-model';

const REPORT_COLUMNS =
  'id, lesson_id, student_id, teacher_id, attendance, program, recited, new_memorization, revision, theory, ' +
  'grade_recitation, grade_memorization, grade_revision, grade_tajweed, grade_engagement, ' +
  'grade_commitment, grade_overall, notes, homework, next_plan, version';

export interface ReportRow {
  id: string;
  lesson_id: string;
  student_id: string;
  teacher_id: string;
  attendance: Attendance | null;
  program: Program | null;
  recited: string | null;
  new_memorization: string | null;
  revision: string | null;
  theory: string | null;
  grade_recitation: Grade | null;
  grade_memorization: Grade | null;
  grade_revision: Grade | null;
  grade_tajweed: Grade | null;
  grade_engagement: Grade | null;
  grade_commitment: Grade | null;
  grade_overall: Grade | null;
  notes: string | null;
  homework: string | null;
  next_plan: string | null;
  version: number;
}

/** Everything one report PDF and its message need, read with the service role. */
export interface ReportSource {
  report: ReportRow;
  /** trial: its rule's package is 'trial' (the CRM's report_trial_session, docs/19). */
  lesson: { starts_at: string; ends_at: string; trial?: boolean };
  student: { name: string; code: string; program: Program };
  guardian: { id: string; phone_e164: string; tz: string };
  teacher: { display_name_ar: string };
  /** v_lesson_sequence.seq: set once the lesson is completed. */
  seq: number | null;
  /** Completed lessons before this one, read only when seq is null (lesson number fallback). */
  completedBefore: number;
  /** v_package_lessons.n: this lesson's place among the student's consuming lessons. */
  packageN: number | null;
  packages: SlotPackage[];
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what} read failed: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what} not found`);
  return res.data;
}

/**
 * Separate reads, not one embed: lesson_reports reaches students only through the composite FK to
 * lesson_students. A handful of reports a day makes seven small queries per PDF fine.
 */
@Injectable()
export class ReportPdfSource {
  constructor(@Inject(DB) private readonly db: Db) {}

  async load(reportId: string): Promise<ReportSource | null> {
    const res = await this.db.from('lesson_reports').select(REPORT_COLUMNS).eq('id', reportId).maybeSingle();
    if (res.error) throw new Error(`report read failed: ${res.error.message}`);
    if (!res.data) return null;
    const report = res.data as unknown as ReportRow;
    const pair = { lesson_id: report.lesson_id, student_id: report.student_id };
    const [lesson, student, teacher, seq, slot, subs] = await Promise.all([
      this.db.from('lessons').select('starts_at, ends_at, rule:schedule_rules(package)').eq('id', report.lesson_id).maybeSingle(),
      this.db
        .from('students')
        .select('name, code, program, guardians(id, phone_e164, tz)')
        .eq('id', report.student_id)
        .maybeSingle(),
      this.db.from('teachers').select('display_name_ar').eq('id', report.teacher_id).maybeSingle(),
      this.db.from('v_lesson_sequence').select('seq').match(pair).maybeSingle(),
      this.db.from('v_package_lessons').select('n').match(pair).maybeSingle(),
      // A cancelled package holds no slot (v_package_lessons skips it too, migration 934).
      this.db.from('subscriptions').select('id, lessons_total, starts_on, created_at').eq('student_id', report.student_id).neq('status', 'cancelled'),
    ]);
    const l = must(lesson, 'lesson');
    const s = must(student, 'student');
    const n = must({ data: seq.data ?? { seq: null }, error: seq.error }, 'sequence').seq;
    return {
      report,
      lesson: { starts_at: l.starts_at, ends_at: l.ends_at, trial: l.rule?.package === 'trial' },
      // code is a generated column (never null); the type says nullable.
      student: { name: s.name, code: s.code ?? '', program: s.program },
      guardian: must({ data: s.guardians, error: null }, 'guardian'),
      teacher: must(teacher, 'teacher'),
      seq: n,
      completedBefore: n === null ? await this.completedBefore(report.student_id, l.starts_at) : 0,
      packageN: must({ data: slot.data ?? { n: null }, error: slot.error }, 'package lesson').n,
      packages: must(subs, 'subscriptions').map((p) => ({
        id: p.id,
        lessonsTotal: p.lessons_total,
        startsOn: p.starts_on,
        createdAt: p.created_at,
      })),
    };
  }

  /** Completed lessons of the student that started before `startsAt` (R-LES-03 fallback). */
  private async completedBefore(studentId: string, startsAt: string): Promise<number> {
    const { count, error } = await this.db
      .from('lesson_students')
      .select('lesson_id, lessons!inner(starts_at, status)', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('lessons.status', 'completed')
      .lt('lessons.starts_at', startsAt);
    if (error) throw new Error(`lesson count failed: ${error.message}`);
    return count ?? 0;
  }
}
