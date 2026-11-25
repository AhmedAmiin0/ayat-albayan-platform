import { canEndLesson, isClosedLesson, joinWindow, type LessonEndResult } from '@ab/schedule';
import { ConflictException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import type { JoinLesson } from '@/modules/teaching/classroom/classroom.repo';
import { LessonRoleService } from '@/modules/teaching/classroom/join/lesson-role.service';
import { RoomCloser } from '@/modules/teaching/classroom/max-duration/room-closer';
import { lessonTarget } from '@/modules/teaching/classroom/recordings/recording-target';
import { LessonEndRepo } from './lesson-end.repo';
import { RoomPresenceRepo } from './room-presence.repo';

/** End for everyone: idempotent; only a live lesson (409 otherwise); LiveKit failure is logged. */
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
