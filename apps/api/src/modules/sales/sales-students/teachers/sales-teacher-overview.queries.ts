import type { Tables } from '@ab/db';
import type { LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';

/** A student as the overview names them: name and code, nothing else. */
interface NamedStudent {
  student: { name: string; code: string | null } | null;
}

/** An active rule of the teacher: never its meeting_link, subscription or price. */
export type TeacherRuleRow = Pick<
  Tables<'schedule_rules'>,
  'id' | 'byday' | 'start_time_local' | 'tz' | 'duration_min' | 'package' | 'starts_on' | 'ends_on'
> & { students: NamedStudent[] };

/** A lesson of the teacher in the window: when, how it ended and who it was with. */
export interface TeacherLessonRow {
  id: string;
  starts_at: string;
  status: LessonStatus;
  lesson_students: NamedStudent[];
}

const STUDENT = 'student:students(name, code)';
const RULE_SELECT = `id, byday, start_time_local, tz, duration_min, package, starts_on, ends_on, students:schedule_rule_students(${STUDENT})` as const;
const LESSON_SELECT = `id, starts_at, status, lesson_students(${STUDENT})` as const;

/** A month of one teacher's lessons is a few hundred at most. */
const LESSONS_LIMIT = 1000;

/** «الجدول» and «الحضور» of one teacher for sales (service role; whitelisted columns, never money or a link). */
@Injectable()
export class SalesTeacherOverviewQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async exists(teacherId: string): Promise<boolean> {
    const { data, error } = await this.db.from('teachers').select('id').eq('id', teacherId).maybeSingle();
    if (error) throw dbError(error);
    return data !== null;
  }

  async rules(teacherId: string): Promise<TeacherRuleRow[]> {
    const { data, error } = await this.db
      .from('schedule_rules')
      .select(RULE_SELECT)
      .eq('teacher_id', teacherId)
      .eq('status', 'active')
      .overrideTypes<TeacherRuleRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }

  /** The teacher's lessons that started inside [from, to), newest first. */
  async lessons(teacherId: string, w: { from: Date; to: Date }): Promise<TeacherLessonRow[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select(LESSON_SELECT)
      .eq('teacher_id', teacherId)
      .gte('starts_at', w.from.toISOString())
      .lt('starts_at', w.to.toISOString())
      .order('starts_at', { ascending: false })
      .limit(LESSONS_LIMIT)
      .overrideTypes<TeacherLessonRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }
}
