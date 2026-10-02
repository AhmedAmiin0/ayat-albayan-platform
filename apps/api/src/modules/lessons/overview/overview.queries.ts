import type { Gender, Program, TeacherStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../../teachers/http';
import type { LessonWindow } from '../lessons.queries';

export type OverviewTeacherRow = {
  id: string;
  display_name_ar: string;
  gender: Gender;
  programs: Program[];
  tz: string;
  meeting_link: string | null;
  max_students: number | null;
  status: TeacherStatus;
};
export type OverviewSlotRow = { teacher_id: string; weekday: number; start_time: string; end_time: string; tz: string };
export type OverviewTimeOffRow = { id: string; teacher_id: string; starts_at: string; ends_at: string; reason: string | null };

/**
 * The three small batched reads behind GET /lessons/overview (R-SCH-09, R-NFR-08): every teacher,
 * every weekly row and the time off overlapping the window — or one teacher's with `teacherId`.
 * Service role; the controller is admin only.
 */
@Injectable()
export class OverviewQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async teachers(w: LessonWindow): Promise<OverviewTeacherRow[]> {
    let q = this.db.from('teachers').select('id, display_name_ar, gender, programs, tz, meeting_link, max_students, status');
    if (w.teacherId) q = q.eq('id', w.teacherId);
    const { data, error } = await q.order('display_name_ar').order('id');
    if (error) throw dbError(error);
    return data;
  }

  async slots(w: LessonWindow): Promise<OverviewSlotRow[]> {
    let q = this.db.from('teacher_availability').select('teacher_id, weekday, start_time, end_time, tz');
    if (w.teacherId) q = q.eq('teacher_id', w.teacherId);
    const { data, error } = await q.order('weekday').order('start_time');
    if (error) throw dbError(error);
    return data;
  }

  /** Same overlap as AvailabilityQueries.listTimeOff(range): starts before `to`, ends after `from`. */
  async timeOff(w: LessonWindow): Promise<OverviewTimeOffRow[]> {
    let q = this.db
      .from('teacher_time_off')
      .select('id, teacher_id, starts_at, ends_at, reason')
      .lt('starts_at', w.to.toISOString())
      .gt('ends_at', w.from.toISOString());
    if (w.teacherId) q = q.eq('teacher_id', w.teacherId);
    const { data, error } = await q.order('starts_at');
    if (error) throw dbError(error);
    return data;
  }
}
