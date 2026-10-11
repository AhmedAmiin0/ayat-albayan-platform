import type { RoomJoinResult } from '@ab/shared';
import { joinWindowConfig } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import type { AuthUser } from '../../common/auth/verify-token';
import { assertWindowOpen } from './join-gate';
import { LessonRoleService } from './lesson-role.service';
import { RoomAdmission } from './room-admission';

/**
 * POST /lessons/:id/room/join. Who may enter is LessonRoleService's rule (admin, the lesson's
 * teacher, an assigned assistant, a salesperson: her trial as sales, any other lesson as assistant). The window (settings.join_opens_before_min
 * before to join_closes_after_min after) binds teachers, assistants and salespeople; an admin may always enter, to supervise
 * or to help. Someone removed from this lesson's room is refused 403 removed_from_room.
 */
@Injectable()
export class RoomJoinService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly admission: RoomAdmission,
    private readonly settings: SettingsService,
  ) {}

  async join(input: { user: AuthUser; lessonId: string }, now = new Date()): Promise<RoomJoinResult> {
    this.admission.livekit();
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    if (role !== 'admin') assertWindowOpen(lesson, now, joinWindowConfig(await this.settings.all()));
    const name = await this.roles.nameOf(input.user, { role, lesson });
    return this.admission.admit({ lessonId: lesson.id, role, name, principal: { userId: input.user.id } }, now);
  }
}
