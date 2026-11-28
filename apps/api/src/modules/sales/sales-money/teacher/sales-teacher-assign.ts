import type { SalesTeacherOption } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { badRequest } from '@/common/http/errors';
import { maybe, pgError, rows } from '@/common/db/errors';

/** docs/31 §2, docs/16 row 16: migration 972; the caller checked the student is hers. */
@Injectable()
export class SalesTeacherAssign {
  constructor(@Inject(DB) private readonly db: Db) {}

  async options(): Promise<SalesTeacherOption[]> {
    const data = rows(
      await this.db
        .from('teachers')
        .select('id, display_name_ar')
        .eq('status', 'active')
        .order('display_name_ar'),
    );
    return data.map((t) => ({ id: t.id, name: t.display_name_ar }));
  }

  /**
   * 400 teacher_not_found BEFORE the package is made: a teacher gone inactive after the cached list
   * would else leave a saved package and a retry with another pick (a new clientRequestId) a second one.
   */
  async ensureActive(teacherId: string): Promise<void> {
    const data = maybe(
      await this.db
        .from('teachers')
        .select('id')
        .eq('id', teacherId)
        .eq('status', 'active')
        .maybeSingle(),
    );
    if (!data) throw badRequest('teacher_not_found');
  }

  /** 400 teacher_not_found for an unknown or inactive teacher; true when the teacher changed. */
  async assign(input: { studentId: string; teacherId: string; actorId: string }): Promise<boolean> {
    const args = { p_student: input.studentId, p_teacher: input.teacherId, p_actor: input.actorId };
    const { data, error } = await this.db.rpc('assign_student_teacher', args);
    if (error?.message.includes('teacher_not_found')) throw badRequest('teacher_not_found');
    if (error) throw pgError(error);
    return data;
  }
}
