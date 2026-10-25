import { meetingModeOf, usesPlatform, type Attendance, type Grade, type LessonStatus, type Program } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { loadEnv } from '../../../config/env/env';
import { firstWebOrigin } from '../../classroom/classroom.config';
import { classroomUrl } from '../../reminders/reminders.links';
import type { EventLesson, LessonKind } from '../writers/calendar/event-format';
import { GoogleSyncAcademySettings } from './google-sync.settings';

/** A lesson as the calendar writer needs it; origin=false: imported, never written (§2.2). */
export type LessonSource = { origin: boolean; teacherId: string; lesson: EventLesson };

/** A platform report as the Drive and Sheets writers need it. */
export interface ReportSource {
  reportId: string;
  studentId: string;
  studentName: string;
  studentProgram: Program | null;
  teacherName: string;
  startsAt: string;
  meetingLink: string | null;
  seq: number | null;
  report: { attendance: Attendance | null; program: Program | null; recited: string | null; new_memorization: string | null; revision: string | null; grade_overall: Grade | null; notes: string | null; homework: string | null };
  pdfPath: string | null;
  pdfReady: boolean;
  version: number;
  /** false for an imported report (import_items) or a draft: never exported. */
  exportable: boolean;
}

const LESSON =
  'id, teacher_id, starts_at, ends_at, status, meeting_link, makeup_of_id, teacher:teachers(display_name_ar, meeting_mode), rule:schedule_rules!lessons_rule_id_fkey(byday, package), lesson_students(student:students(name, guardians(phone_e164)))';
const REPORT = 'id, lesson_id, student_id, teacher_id, status, version, pdf_path, pdf_status, attendance, program, recited, new_memorization, revision, grade_overall, notes, homework';

const fail = (what: string, error: { message: string }) => new Error(`google ${what} read failed: ${error.message}`);

/** Reads with the service role; one lesson or report per call (a handful a minute). */
@Injectable()
export class GoogleSyncSource {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: GoogleSyncAcademySettings,
  ) {}

  async lesson(lessonId: string): Promise<LessonSource | null> {
    const [l, origin, { meeting_link_auto: auto }] = await Promise.all([
      this.db.from('lessons').select(LESSON).eq('id', lessonId).maybeSingle(),
      this.db.from('v_platform_origin_lessons').select('id').eq('id', lessonId).maybeSingle(),
      this.settings.read(),
    ]);
    if (l.error) throw fail('lesson', l.error);
    if (origin.error) throw fail('origin', origin.error);
    if (!l.data) return null;
    const row = l.data;
    const platform = usesPlatform(meetingModeOf(row.teacher?.meeting_mode), auto);
    const kind: LessonKind = row.rule?.package === 'trial' ? 'trial' : row.makeup_of_id ? 'makeup' : 'package';
    const lesson: EventLesson = {
      id: row.id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status as LessonStatus,
      teacherName: row.teacher?.display_name_ar ?? '',
      students: row.lesson_students.map((s) => ({ name: s.student?.name ?? '', phone: s.student?.guardians?.phone_e164 ?? null })),
      link: platform ? classroomUrl(firstWebOrigin(loadEnv().WEB_ORIGIN), row.id) : row.meeting_link,
      kind,
      byday: row.rule?.byday ?? null,
    };
    return { origin: origin.data !== null, teacherId: row.teacher_id, lesson };
  }

  async report(reportId: string): Promise<ReportSource | null> {
    const r = await this.db.from('lesson_reports').select(REPORT).eq('id', reportId).maybeSingle();
    if (r.error) throw fail('report', r.error);
    if (!r.data) return null;
    const rep = r.data;
    const [lesson, student, teacher, seq, imported] = await Promise.all([
      this.db.from('lessons').select('starts_at, meeting_link').eq('id', rep.lesson_id).maybeSingle(),
      this.db.from('students').select('name, program').eq('id', rep.student_id).maybeSingle(),
      this.db.from('teachers').select('display_name_ar').eq('id', rep.teacher_id).maybeSingle(),
      this.db.from('v_lesson_sequence').select('seq').match({ lesson_id: rep.lesson_id, student_id: rep.student_id }).maybeSingle(),
      this.db.from('import_items').select('id').eq('target_table', 'lesson_reports').eq('target_id', reportId).limit(1),
    ]);
    for (const [what, res] of [['lesson', lesson], ['student', student], ['teacher', teacher], ['sequence', seq], ['import', imported]] as const) {
      if (res.error) throw fail(what, res.error);
    }
    if (!lesson.data || !student.data) return null;
    return {
      reportId: rep.id, studentId: rep.student_id, studentName: student.data.name, studentProgram: student.data.program,
      teacherName: teacher.data?.display_name_ar ?? '', startsAt: lesson.data.starts_at, meetingLink: lesson.data.meeting_link,
      seq: seq.data?.seq ?? null, report: rep, pdfPath: rep.pdf_path, pdfReady: rep.pdf_status === 'ready', version: rep.version,
      exportable: rep.status === 'submitted' && (imported.data ?? []).length === 0,
    };
  }
}
