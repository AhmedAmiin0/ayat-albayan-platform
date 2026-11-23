import type { Attendance, LessonStatus, PackageSize } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/**
 * A past lesson of the student as the family's history reads it (whitelisted select: never the
 * meeting link, notes or a price). `own` is the student's own attendance row only.
 */
export interface PortalPastRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  /** Read only to decide the family's excuse (familyReason); never sent as is. */
  cancel_reason: string | null;
  /** The series' last day: a series-end text is never the family's excuse. */
  rule: { package: PackageSize | null; ends_on: string | null; tz: string } | null;
  teacher: { display_name_ar: string; display_name_en: string | null } | null;
  own: { student_id: string; attendance: Attendance | null }[];
}

const PAST_SELECT =
  'id, starts_at, ends_at, status, cancel_reason, ' +
  'rule:schedule_rules!lessons_rule_id_fkey(package, ends_on, tz), ' +
  'teacher:teachers(display_name_ar, display_name_en), ' +
  'own:lesson_students!inner(student_id, attendance)';
interface BatchQuery {
  studentId: string;
  before: string;
  limit: number;
}

/** A month of one student's lessons is a few dozen. */
const MONTH_LIMIT = 200;

/** Service role; PortalScopes already decided the student. */
@Injectable()
export class PortalHistoryRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The student's lessons that started before `before`, newest first (one keyset batch). */
  async before(input: BatchQuery): Promise<PortalPastRow[]> {
    const { data, error } = await this.base(input.studentId)
      .lt('starts_at', input.before)
      .order('starts_at', { ascending: false })
      .limit(input.limit)
      .overrideTypes<PortalPastRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }

  /** The student's lessons that started inside [from, to) (this month's counts). */
  async between(input: { studentId: string; from: Date; to: Date }): Promise<PortalPastRow[]> {
    const { data, error } = await this.base(input.studentId)
      .gte('starts_at', input.from.toISOString())
      .lt('starts_at', input.to.toISOString())
      .limit(MONTH_LIMIT)
      .overrideTypes<PortalPastRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }

  private base(studentId: string) {
    return this.db.from('lessons').select(PAST_SELECT).eq('own.student_id', studentId);
  }
}
