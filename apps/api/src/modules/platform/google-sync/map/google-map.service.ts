import type { GoogleStudentMapInput, GoogleStudentMapRow, GoogleTeacherMapRow } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { readDiscovery } from './discovery';
import { GoogleData } from '../google-data';
import { GoogleRuntime } from '../google-runtime';
import { GoogleMapQueries, type StudentRow } from './google-map.queries';
import { suggestCalendar, suggestFolder, type SummaryLink } from './suggest';

function studentView(r: StudentRow, links: readonly SummaryLink[]): GoogleStudentMapRow {
  const s = suggestFolder(r.name, links);
  return {
    student_id: r.id, code: r.code, name: r.name,
    folder_id: r.files?.folder_id ?? null, attendance_sheet_id: r.files?.attendance_sheet_id ?? null,
    create_new: r.files !== null && r.files.folder_id === null, confirmed_at: r.files?.confirmed_at ?? null,
    suggestion: s ? { folder_id: s.folderId, attendance_sheet_id: s.sheetId, name: s.name } : null,
  };
}

/** Teacher ↔ calendar and student ↔ folder mappings: suggested by discovery, used only once confirmed. */
@Injectable()
export class GoogleMapService {
  constructor(
    private readonly map: GoogleMapQueries,
    private readonly data: GoogleData,
    private readonly run: GoogleRuntime,
  ) {}

  private async discovery() {
    return readDiscovery((await this.data.account.get()).discovery);
  }

  async teachers(): Promise<GoogleTeacherMapRow[]> {
    const [rows, d] = await Promise.all([this.map.teachers(), this.discovery()]);
    return rows.map((t) => ({
      teacher_id: t.id, name: t.display_name_ar,
      calendar_id: t.calendar?.calendar_id ?? null, calendar_name: t.calendar?.calendar_name ?? null, confirmed_at: t.calendar?.confirmed_at ?? null,
      suggestion: suggestCalendar(t, d?.calendars ?? []),
    }));
  }

  async setTeacher(input: { teacherId: string; calendarId: string | null; actorId: string }): Promise<void> {
    const { teacherId, calendarId, actorId } = input;
    if (!(await this.map.teachers()).some((t) => t.id === teacherId)) throw new NotFoundException();
    const name = calendarId ? ((await this.discovery())?.calendars.find((c) => c.id === calendarId)?.name ?? null) : null;
    await this.map.setTeacher({ teacherId, calendar: calendarId ? { id: calendarId, name } : null, actorId });
    await this.run.audit.record({ actorId, entity: 'google_teacher_calendars', entityId: teacherId, action: calendarId ? 'confirm' : 'remove', before: null, after: { calendar_id: calendarId } });
    if (calendarId) await this.data.items.requeue('teacher_unmapped');
    void this.run.job.kick();
  }

  async students(q: string): Promise<GoogleStudentMapRow[]> {
    const [rows, d] = await Promise.all([this.map.students(q), this.discovery()]);
    return rows.map((r) => studentView(r, d?.students ?? []));
  }

  async setStudent(input: { studentId: string; files: GoogleStudentMapInput | null; actorId: string }): Promise<GoogleStudentMapRow> {
    const { studentId, files, actorId } = input;
    if (!(await this.map.student(studentId))) throw new NotFoundException();
    await this.map.setStudent({ studentId, files, actorId });
    await this.run.audit.record({ actorId, entity: 'google_student_files', entityId: studentId, action: files ? 'confirm' : 'remove', before: null, after: files ? { ...files } : null });
    if (files) await this.data.items.requeue('student_unmapped');
    void this.run.job.kick();
    const row = await this.map.student(studentId);
    if (!row) throw new NotFoundException();
    return studentView(row, (await this.discovery())?.students ?? []);
  }
}
