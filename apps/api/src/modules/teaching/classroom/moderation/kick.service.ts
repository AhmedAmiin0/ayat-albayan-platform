import { canRemove, JOIN_ROLES, lessonRoomName, type JoinRole } from '@ab/schedule';
import { BadGatewayException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { notConfigured } from '@/modules/teaching/classroom/join/join-gate';
import { LessonRoleService } from '@/modules/teaching/classroom/join/lesson-role.service';
import { LivekitApi, LivekitError } from '@/modules/teaching/classroom/livekit/livekit-api';
import { ModerationRepo, principalOf, type ParticipantRow } from './moderation.repo';
import { RoomPersonRepo } from './room-person.repo';

const asJoinRole = (role: string): JoinRole | null => JOIN_ROLES.find((r) => r === role) ?? null;

interface BlockInput {
  lessonId: string;
  target: ParticipantRow;
  blockedBy: string;
}

interface KickInput {
  user: AuthUser;
  lessonId: string;
  identity: string;
}

/** The removed person is blocked first (every link or their login), then disconnected; audited. */
@Injectable()
export class KickService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly moderation: ModerationRepo,
    private readonly livekit: LivekitApi,
    @Inject(RoomPersonRepo) private readonly persons: RoomPersonRepo,
  ) {}

  /** 404 participant_not_found, 403 cannot_remove, 503 classroom_not_configured, 502 LiveKit. */
  async remove(input: KickInput): Promise<void> {
    if (!this.livekit.configured) throw notConfigured();
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    const target = await this.moderation.participant(lesson.id, input.identity);
    if (!target) throw notFound('participant_not_found');
    const targetRole = asJoinRole(target.role);
    if (!targetRole || !canRemove(role, targetRole)) {
      throw new HttpException({ code: 'cannot_remove', message: 'cannot_remove' }, HttpStatus.FORBIDDEN);
    }
    const identities = await this.block({ lessonId: lesson.id, target, blockedBy: input.user.id });
    await this.disconnect(lessonRoomName(lesson.id), identities);
  }

  /** Blocks the person's every principal; answers every identity of theirs (the target's first). */
  private async block(input: BlockInput): Promise<string[]> {
    const { lessonId, target } = input;
    const principal = principalOf(target);
    if (!principal) return [target.identity];
    const principals = await this.persons.principalsOf(lessonId, principal);
    const who = { identity: target.identity, role: target.role, name: target.name };
    for (const p of principals) {
      const blockedBy = input.blockedBy;
      await this.moderation.block({ lessonId, principal: p, blockedBy, target: who });
    }
    const others = await this.persons.identitiesOf(lessonId, principals);
    return [...new Set([target.identity, ...others])];
  }

  private async disconnect(room: string, identities: readonly string[]): Promise<void> {
    try {
      for (const identity of identities) await this.livekit.revokeAndRemove({ room, identity });
    } catch (e) {
      if (e instanceof LivekitError) throw new BadGatewayException({ code: 'livekit_error', message: e.message });
      throw e;
    }
  }
}
