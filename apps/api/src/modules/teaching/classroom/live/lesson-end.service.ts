import { canEndLesson, type LessonEndResult } from '@ab/shared';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { LessonRoleService } from '@/modules/teaching/classroom/join/lesson-role.service';
import { RoomCloser } from '@/modules/teaching/classroom/max-duration/room-closer';
import { lessonTarget } from '@/modules/teaching/classroom/recordings/recording-target';
import { LessonEndRepo } from './lesson-end.repo';
import { RoomPresenceRepo } from './room-presence.repo';

/**
 * «إنهاء الحلقة للجميع» (POST /lessons/:id/end, owner 2026-11-16), as «إنهاء» ends a meeting: the
 * lesson's teacher or an admin stamps lessons.room_ended_at (every join gate then answers 410
 * lesson_ended, so «ادخل مرة أخرى» cannot reopen it), nobody counts as inside any more, and the
 * LiveKit room closes for everyone (a running recording is stopped first, its file kept). Idempotent:
 * a second end answers the first time. A LiveKit failure is logged; the stamp already holds.
 */
@Injectable()
export class LessonEndService {
  private readonly log = new Logger(LessonEndService.name);

  constructor(
    private readonly roles: LessonRoleService,
    private readonly ends: LessonEndRepo,
    private readonly presence: RoomPresenceRepo,
    private readonly closer: RoomCloser,
  ) {}

  /** 404 lesson_not_found, 403 not the lesson's teacher nor an admin. */
  async end(input: { user: AuthUser; lessonId: string }, now = new Date()): Promise<LessonEndResult> {
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    if (!canEndLesson(role)) throw new ForbiddenException();
    const endedAt = await this.ends.stamp(lesson.id, now.toISOString());
    await this.presence.leaveAll(lesson.id, endedAt);
    await this.close(lesson.id, now);
    return { endedAt };
  }

  private async close(lessonId: string, now: Date): Promise<void> {
    if (!this.closer.configured) return;
    await this.closer.close(lessonTarget(lessonId), now).catch((e: unknown) => {
      this.log.warn(`close lesson room ${lessonId}: ${String(e)}`);
    });
  }
}
