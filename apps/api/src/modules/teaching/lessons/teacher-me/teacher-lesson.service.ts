import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { LessonAccess } from '@/modules/teaching/lessons/store/lesson-access';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { LessonCancelService } from '@/modules/teaching/lessons/status/lesson-cancel.service';
import { TeacherCancelPush } from './teacher-cancel.push';
import { TeacherConfirmRepo } from './teacher-confirm.repo';
import { assertConfirmed, assertTeacherMayCancel } from './teacher-lesson.rules';

export interface TeacherCancel {
  lessonId: string;
  reason: string;
  actor: AuthUser;
}

/** Bundles the four collaborators (constructor cap, docs/32 D1). */
@Injectable()
export class TeacherLessonDeps {
  constructor(
    readonly access: LessonAccess,
    readonly cancels: LessonCancelService,
    readonly confirms: TeacherConfirmRepo,
    readonly push: TeacherCancelPush,
  ) {}
}

/**
 * The teacher's own lesson actions (docs/46 C3, C4) under /teachers/me: her lessons only.
 * Cancel: ONE open lesson before its start, `by: 'teacher'` and `scope: 'one'` forced (status
 * cancelled_by_teacher: not charged, not paid, the existing rule). «سأحضر»: never the status.
 */
@Injectable()
export class TeacherLessonService {
  constructor(
    private readonly store: LessonStore,
    private readonly deps: TeacherLessonDeps,
  ) {}

  async cancel({ lessonId, reason, actor }: TeacherCancel, now = new Date()): Promise<string> {
    const lesson = await this.store.get(lessonId);
    await this.deps.access.assertCanTouch(actor, lesson);
    assertTeacherMayCancel(lesson, now);
    const body = { by: 'teacher', scope: 'one', reason } as const;
    await this.deps.cancels.cancel({ lessonId, body, actor });
    await this.deps.push.notify(lesson, reason);
    return lesson.id;
  }

  async confirm(lessonId: string, actor: AuthUser): Promise<string> {
    const teacherId = await this.deps.access.teacherId(actor);
    assertConfirmed(await this.deps.confirms.confirm({ lessonId, teacherId, actorId: actor.id }));
    return lessonId;
  }
}
