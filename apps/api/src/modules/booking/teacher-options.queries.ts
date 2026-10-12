import type { Gender, Program } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { SettingsService } from '../../common/settings/settings.service';
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
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: SettingsService,
  ) {}

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

  /** Teachers among `teacherIds` with at least one weekly availability row (all of them while 24/7 is on). */
  async withAvailability(teacherIds: readonly string[]): Promise<Set<string>> {
    if (await this.settings.get('teachers_always_available')) return new Set(teacherIds);
    const { data, error } = await this.db
      .from('teacher_availability')
      .select('teacher_id')
      .in('teacher_id', teacherIds);
    if (error) throw dbError(error);
    return new Set(data.map((r) => r.teacher_id));
  }
}
