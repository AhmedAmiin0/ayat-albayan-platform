import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import type { TeacherNames } from './suggest';

export type TeacherRow = TeacherNames & { id: string; calendar: { calendar_id: string; calendar_name: string | null; confirmed_at: string } | null };
export type StudentRow = {
  id: string;
  code: string;
  name: string;
  files: { folder_id: string | null; attendance_sheet_id: string | null; confirmed_at: string } | null;
};
export type StudentFiles = { folder_id: string | null; attendance_sheet_id: string | null; summary_row_hint: number | null };

const fail = (what: string, error: { message: string }) => new Error(`google ${what} failed: ${error.message}`);
/** Students the sync may write for: everyone who has (or had) lessons in the platform's sense. */
const STUDENT_STATUSES = ['trial', 'active', 'pending_subscription', 'pending_renewal', 'paused'] as const;

/** google_teacher_calendars / google_student_files and the people they map, with the service role. */
@Injectable()
export class GoogleMapQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async teachers(): Promise<TeacherRow[]> {
    const [t, m] = await Promise.all([
      this.db.from('teachers').select('id, display_name_ar, display_name_en, google_calendar_id').eq('status', 'active').order('display_name_ar'),
      this.db.from('google_teacher_calendars').select('teacher_id, calendar_id, calendar_name, confirmed_at'),
    ]);
    if (t.error) throw fail('teachers read', t.error);
    if (m.error) throw fail('teacher calendars read', m.error);
    const byTeacher = new Map(m.data.map((r) => [r.teacher_id, r]));
    return t.data.map((r) => ({ ...r, calendar: byTeacher.get(r.id) ?? null }));
  }

  async teacherCalendar(teacherId: string): Promise<string | null> {
    const { data, error } = await this.db.from('google_teacher_calendars').select('calendar_id').eq('teacher_id', teacherId).maybeSingle();
    if (error) throw fail('teacher calendar read', error);
    return data?.calendar_id ?? null;
  }

  async mappedCalendarNames(): Promise<string[]> {
    const { data, error } = await this.db.from('google_teacher_calendars').select('calendar_id, calendar_name');
    if (error) throw fail('teacher calendars read', error);
    return data.map((r) => r.calendar_name ?? r.calendar_id);
  }

  async setTeacher(input: { teacherId: string; calendar: { id: string; name: string | null } | null; actorId: string }): Promise<void> {
    const { teacherId, calendar, actorId } = input;
    const { error } = calendar
      ? await this.db.from('google_teacher_calendars').upsert({ teacher_id: teacherId, calendar_id: calendar.id, calendar_name: calendar.name, confirmed_by: actorId, confirmed_at: new Date().toISOString() })
      : await this.db.from('google_teacher_calendars').delete().eq('teacher_id', teacherId);
    if (error) throw fail('teacher calendar write', error);
  }

  async students(q: string): Promise<StudentRow[]> {
    let query = this.db.from('students').select('id, code, name').in('status', [...STUDENT_STATUSES]).order('name').limit(200);
    const text = q.trim().replace(/[%,()]/g, ' ').trim();
    if (text) query = query.or(`name.ilike.%${text}%,code.ilike.%${text}%`);
    const s = await query;
    if (s.error) throw fail('students read', s.error);
    const ids = s.data.map((r) => r.id);
    const f = ids.length ? await this.db.from('google_student_files').select('student_id, folder_id, attendance_sheet_id, confirmed_at').in('student_id', ids) : { data: [], error: null };
    if (f.error) throw fail('student files read', f.error);
    const byStudent = new Map(f.data.map((r) => [r.student_id, r]));
    return s.data.map((r) => ({ id: r.id, code: r.code ?? '', name: r.name, files: byStudent.get(r.id) ?? null }));
  }

  async student(studentId: string): Promise<StudentRow | null> {
    const s = await this.db.from('students').select('id, code, name').eq('id', studentId).maybeSingle();
    if (s.error) throw fail('student read', s.error);
    if (!s.data) return null;
    const f = await this.db.from('google_student_files').select('folder_id, attendance_sheet_id, confirmed_at').eq('student_id', studentId).maybeSingle();
    if (f.error) throw fail('student files read', f.error);
    return { id: s.data.id, code: s.data.code ?? '', name: s.data.name, files: f.data };
  }

  /** The confirmed mapping, or null (nothing is written for an unconfirmed student). */
  async files(studentId: string): Promise<StudentFiles | null> {
    const { data, error } = await this.db.from('google_student_files').select('folder_id, attendance_sheet_id, summary_row_hint').eq('student_id', studentId).maybeSingle();
    if (error) throw fail('student files read', error);
    return data;
  }

  async setStudent(input: { studentId: string; files: Omit<StudentFiles, 'summary_row_hint'> | null; actorId: string }): Promise<void> {
    const { studentId, files, actorId } = input;
    const { error } = files
      ? await this.db.from('google_student_files').upsert({ student_id: studentId, ...files, confirmed_by: actorId, confirmed_at: new Date().toISOString() })
      : await this.db.from('google_student_files').delete().eq('student_id', studentId);
    if (error) throw fail('student files write', error);
  }

  /** The existing sheet found in a confirmed folder (not made by the platform). */
  async recordSheet(input: { studentId: string; sheetId: string }): Promise<void> {
    const { error } = await this.db.from('google_student_files').update({ attendance_sheet_id: input.sheetId }).eq('student_id', input.studentId);
    if (error) throw fail('student files record', error);
  }

  /** The platform made a folder / sheet for this student: recorded at once, so a retry never makes a second one. */
  async recordCreated(input: { studentId: string; patch: Partial<StudentFiles> }): Promise<void> {
    const { error } = await this.db.from('google_student_files').update({ ...input.patch, created_by_platform: true }).eq('student_id', input.studentId);
    if (error) throw fail('student files record', error);
  }
}
