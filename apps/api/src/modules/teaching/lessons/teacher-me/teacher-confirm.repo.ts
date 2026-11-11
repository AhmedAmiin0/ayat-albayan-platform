import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/** What teacher_confirm_lesson answers (migration 20261111000200). */
export const confirmOutcome = z.enum(['ok', 'not_found', 'not_owner', 'closed', 'started']);
export type ConfirmOutcome = z.infer<typeof confirmOutcome>;

interface TeacherConfirm {
  lessonId: string;
  teacherId: string;
  actorId: string;
}

/**
 * «سأحضر» (docs/46 D1): one atomic, audited write that checks ownership, an open status and a
 * future start under a row lock. It never touches lessons.status.
 */
@Injectable()
export class TeacherConfirmRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async confirm({ lessonId, teacherId, actorId }: TeacherConfirm): Promise<ConfirmOutcome> {
    const { data, error } = await this.db.rpc('teacher_confirm_lesson', {
      p_lesson: lessonId,
      p_teacher: teacherId,
      p_actor: actorId,
    });
    if (error) throw dbError(error);
    return confirmOutcome.parse(data);
  }
}
