import { canRemove, JOIN_ROLES, lessonRoomName, type JoinRole } from '@ab/shared';
import { BadGatewayException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { notConfigured } from './join-gate';
import { LessonRoleService } from './lesson-role.service';
import { LivekitApi, LivekitError } from './livekit-api';
import { ModerationQueries, principalOf } from './moderation.queries';

const asJoinRole = (role: string): JoinRole | null => JOIN_ROLES.find((r) => r === role) ?? null;

export interface KickInput {
  user: AuthUser;
  lessonId: string;
  identity: string;
}

/**
 * «إخراج من الحلقة» (POST /lessons/:id/room/participants/:identity/remove). The remover's role
 * in this lesson is computed like a join's; canRemove (@ab/shared) decides. The removed login or
 * guest link is blocked first (every later join of this lesson: 403 removed_from_room), then
 * LiveKit disconnects the identity now. Audited (participant_removed).
 */
@Injectable()
export class KickService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly moderation: ModerationQueries,
    private readonly livekit: LivekitApi,
  ) {}

  /** 404 participant_not_found, 403 cannot_remove, 503 classroom_not_configured, 502 LiveKit refused. */
  async remove(input: KickInput): Promise<void> {
    if (!this.livekit.configured) throw notConfigured();
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    const target = await this.moderation.participant(lesson.id, input.identity);
    if (!target) throw notFound('participant_not_found');
    const targetRole = asJoinRole(target.role);
    if (!targetRole || !canRemove(role, targetRole)) {
      throw new HttpException({ code: 'cannot_remove', message: 'cannot_remove' }, HttpStatus.FORBIDDEN);
    }
    const principal = principalOf(target);
    if (principal) {
      await this.moderation.block({
        lessonId: lesson.id,
        principal,
        blockedBy: input.user.id,
        target: { identity: target.identity, role: target.role, name: target.name },
      });
    }
    try {
      await this.livekit.removeParticipant({ room: lessonRoomName(lesson.id), identity: target.identity });
    } catch (e) {
      if (e instanceof LivekitError) throw new BadGatewayException({ code: 'livekit_error', message: e.message });
      throw e;
    }
  }
}
