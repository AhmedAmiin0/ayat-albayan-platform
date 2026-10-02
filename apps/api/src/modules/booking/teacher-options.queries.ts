import type { Gender, Program } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

export type TeacherOptionRow = {
  id: string;
  display_name_ar: string;
  gender: Gender;
  programs: Program[];
  tz: string;
  meeting_link: string | null;
  max_students: number | null;
};
export type TeacherFilter = { program: Program; gender?: Gender };

/** Reads behind GET /booking/teachers (R-SCH-06). */
@Injectable()
export class TeacherOptionsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Active teachers teaching `program`, of `gender` when given, by name. */
  async active(f: TeacherFilter): Promise<TeacherOptionRow[]> {
    let query = this.db
      .from('teachers')
      .select('id, display_name_ar, gender, programs, tz, meeting_link, max_students')
      .eq('status', 'active')
      .contains('programs', [f.program]);
    if (f.gender) query = query.eq('gender', f.gender);
    const { data, error } = await query.order('display_name_ar').order('id');
    if (error) throw dbError(error);
    return data;
  }

  /**
   * Current load: students with this teacher and status trial | active.
   * ponytail: counts rows in JS — fine for one academy; a grouped view if teachers get thousands.
   */
  async loads(teacherIds: readonly string[]): Promise<Map<string, number>> {
    const { data, error } = await this.db
      .from('students')
      .select('teacher_id')
      .in('teacher_id', teacherIds)
      .in('status', ['trial', 'active']);
    if (error) throw dbError(error);
    const counts = new Map<string, number>();
    for (const { teacher_id: id } of data) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }

  /** Teachers among `teacherIds` with at least one weekly availability row. */
  async withAvailability(teacherIds: readonly string[]): Promise<Set<string>> {
    const { data, error } = await this.db
      .from('teacher_availability')
      .select('teacher_id')
      .in('teacher_id', teacherIds);
    if (error) throw dbError(error);
    return new Set(data.map((r) => r.teacher_id));
  }
}
