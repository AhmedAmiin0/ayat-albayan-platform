import { canGrantShare, JOIN_ROLES, lessonRoomName, meetingRoomName, shareGrantSchema, type JoinRole } from '@ab/shared';
import { BadGatewayException, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { parseOrThrow } from '../teachers/http';
import { InternalMeetingsQueries } from './internal-meetings.queries';
import { meetingRoleOf, roleOfIdentity } from './internal-meetings.token';
import { notConfigured } from './join-gate';
import { LessonRoleService } from './lesson-role.service';
import { LivekitApi, LivekitError } from './livekit-api';
import { ModerationQueries } from './moderation.queries';

export interface ShareGrantInput {
  user: AuthUser;
  /** The lesson id, or the internal meeting id. */
  id: string;
  identity: string;
  body: unknown;
}

const cannotGrant = (): HttpException =>
  new HttpException({ code: 'cannot_grant_share', message: 'cannot_grant_share' }, HttpStatus.FORBIDDEN);
const asJoinRole = (role: string): JoinRole | null => JOIN_ROLES.find((r) => r === role) ?? null;

/**
 * «سماح» / «إيقاف مشاركة» after a guest's «اطلب مشاركة الشاشة»: the teacher, an admin or an
 * assistant of that room (canGrantShare) lets one guest publish their screen for this session.
 * Nothing is stored: the permission lives on the LiveKit participant and ends with it.
 */
@Injectable()
export class ShareGrantService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly moderation: ModerationQueries,
    private readonly meetings: InternalMeetingsQueries,
    private readonly livekit: LivekitApi,
  ) {}

  /** 204; 400 body, 404 participant_not_found, 403 cannot_grant_share, 503, 502. */
  async lesson(input: ShareGrantInput): Promise<void> {
    const { allow } = this.check(input.body);
    const { lesson, role } = await this.roles.resolve(input.user, input.id);
    const target = await this.moderation.participant(lesson.id, input.identity);
    if (!target) throw notFound('participant_not_found');
    if (!canGrantShare(role, asJoinRole(target.role))) throw cannotGrant();
    await this.apply({ room: lessonRoomName(lesson.id), identity: target.identity, allow });
  }

  /** The same in an internal meeting: the target's role is the one in its server-minted identity. */
  async meeting(input: ShareGrantInput): Promise<void> {
    const { allow } = this.check(input.body);
    const meeting = await this.meetings.byId(input.id);
    if (!meeting) throw notFound('meeting_not_found');
    const role = meetingRoleOf(input.user, meeting);
    if (!role) throw new ForbiddenException();
    const target = roleOfIdentity(input.identity);
    if (!target) throw notFound('participant_not_found');
    if (!canGrantShare(role, target)) throw cannotGrant();
    await this.apply({ room: meetingRoomName(meeting.id), identity: input.identity, allow });
  }

  private check(body: unknown): { allow: boolean } {
    if (!this.livekit.configured) throw notConfigured();
    return parseOrThrow(shareGrantSchema, body);
  }

  private async apply(input: { room: string; identity: string; allow: boolean }): Promise<void> {
    try {
      await this.livekit.setScreenShare(input);
    } catch (e) {
      if (e instanceof LivekitError && e.code === 'not_found') throw notFound('participant_not_found');
      if (e instanceof LivekitError) throw new BadGatewayException({ code: 'livekit_error', message: e.message });
      throw e;
    }
  }
}
