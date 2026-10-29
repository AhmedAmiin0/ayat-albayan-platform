import type { SalesTeacherOption } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { badRequest } from '../../../../common/http/errors';
import { dbError } from '../../../../common/http/http';

/**
 * «المعلم/ة» of the assistant's subscribe step (owner 2026-10-29, docs/31 §2, docs/16 row 16): the active
 * teachers she may pick (names only) and the assignment itself (assign_student_teacher, migration 972:
 * students.teacher_id + one audit row, nothing when unchanged). The caller checked the student is hers.
 */
@Injectable()
export class SalesTeacherAssign {
  constructor(@Inject(DB) private readonly db: Db) {}

  async options(): Promise<SalesTeacherOption[]> {
    const { data, error } = await this.db.from('teachers').select('id, display_name_ar').eq('status', 'active').order('display_name_ar');
    if (error) throw dbError(error);
    return data.map((t) => ({ id: t.id, name: t.display_name_ar }));
  }

  /**
   * 400 teacher_not_found BEFORE the package is made: a teacher gone inactive after the cached list
   * would else leave a saved package and a retry with another pick (a new clientRequestId) a second one.
   */
  async ensureActive(teacherId: string): Promise<void> {
    const { data, error } = await this.db.from('teachers').select('id').eq('id', teacherId).eq('status', 'active').maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw badRequest('teacher_not_found');
  }

  /** 400 teacher_not_found for an unknown or inactive teacher; true when the teacher changed. */
  async assign(input: { studentId: string; teacherId: string; actorId: string }): Promise<boolean> {
    const args = { p_student: input.studentId, p_teacher: input.teacherId, p_actor: input.actorId };
    const { data, error } = await this.db.rpc('assign_student_teacher', args);
    if (error?.message.includes('teacher_not_found')) throw badRequest('teacher_not_found');
    if (error) throw dbError(error);
    return data;
  }
}
