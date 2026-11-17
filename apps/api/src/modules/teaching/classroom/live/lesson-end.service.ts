import { canEndLesson, isClosedLesson, joinWindow, type LessonEndResult } from '@ab/shared';
import { ConflictException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import type { JoinLesson } from '@/modules/teaching/classroom/classroom.repo';
import { LessonRoleService } from '@/modules/teaching/classroom/join/lesson-role.service';
import { RoomCloser } from '@/modules/teaching/classroom/max-duration/room-closer';
import { lessonTarget } from '@/modules/teaching/classroom/recordings/recording-target';
import { LessonEndRepo } from './lesson-end.repo';
import { RoomPresenceRepo } from './room-presence.repo';

/**
 * «إنهاء الحلقة للجميع» (POST /lessons/:id/end, owner 2026-11-16), as «إنهاء» ends a meeting: the
 * lesson's teacher or an admin stamps lessons.room_ended_at (every join gate then answers 410
 * lesson_ended, so «ادخل مرة أخرى» cannot reopen it), nobody counts as inside any more, and the
 * LiveKit room closes for everyone (a running recording is stopped first, its file kept).
 * Idempotent: a second end answers the first time. Only a held lesson whose window is open or
 * whose room has someone inside (409 lesson_not_live otherwise: never a cancelled one, never one
 * of tomorrow). A LiveKit failure is logged; the stamp holds.
 */
@Injectable()
export class LessonEndService {
  private readonly log = new Logger(LessonEndService.name);

  constructor(
    @Inject(LessonRoleService) private readonly roles: LessonRoleService,
    @Inject(LessonEndRepo) private readonly ends: LessonEndRepo,
    @Inject(RoomPresenceRepo) private readonly presence: RoomPresenceRepo,
    @Inject(RoomCloser) private readonly closer: RoomCloser,
  ) {}

  /** 404 lesson_not_found, 403 not the lesson's teacher nor an admin, 409 lesson_not_live. */
  async end(
    input: { user: AuthUser; lessonId: string },
    now = new Date(),
  ): Promise<LessonEndResult> {
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    if (!canEndLesson(role)) throw new ForbiddenException();
    if (lesson.room_ended_at) return { endedAt: lesson.room_ended_at };
    await this.assertLive(lesson, now);
    const endedAt = await this.ends.stamp(lesson.id, now.toISOString());
    await this.presence.leaveAll(lesson.id, endedAt);
    await this.close(lesson.id, now);
    return { endedAt };
  }

  /** 409 lesson_not_live: cancelled or moved away, or neither in its window nor anyone inside. */
  private async assertLive(lesson: JoinLesson, now: Date): Promise<void> {
    const held = !isClosedLesson(lesson.status);
    const open = held && joinWindow(lesson, now, await this.ends.joinWindow()).state === 'open';
    const live = open || (held && (await this.presence.anyInside(lesson.id)));
    if (!live) throw new ConflictException({ code: 'lesson_not_live', message: 'lesson_not_live' });
  }

  private async close(lessonId: string, now: Date): Promise<void> {
    if (!this.closer.configured) return;
    await this.closer.close(lessonTarget(lessonId), now).catch((e: unknown) => {
      this.log.warn(`close lesson room ${lessonId}: ${String(e)}`);
    });
  }
}
