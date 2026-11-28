import {
  canGrantShare,
  JOIN_ROLES,
  lessonRoomName,
  meetingRoomName,
  type JoinRole,
} from '@ab/schedule';
import { BadGatewayException, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { InternalMeetingsRepo } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.repo';
import { meetingRoleOf, roleOfIdentity } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.token';
import { notConfigured } from '@/modules/teaching/classroom/join/join-gate';
import { LessonRoleService } from '@/modules/teaching/classroom/join/lesson-role.service';
import { LivekitApi, LivekitError } from '@/modules/teaching/classroom/livekit/livekit-api';
import { ModerationRepo } from './moderation.repo';

interface ShareGrantInput {
  user: AuthUser;
  /** The lesson id, or the internal meeting id. */
  id: string;
  identity: string;
  allow: boolean;
}

const cannotGrant = (): HttpException =>
  new HttpException({ code: 'cannot_grant_share', message: 'cannot_grant_share' }, HttpStatus.FORBIDDEN);
const asJoinRole = (role: string): JoinRole | null => JOIN_ROLES.find((r) => r === role) ?? null;

function assertConfigured(livekit: LivekitApi): void {
  if (!livekit.configured) throw notConfigured();
}

async function applyShare(livekit: LivekitApi, input: { room: string; identity: string; allow: boolean }): Promise<void> {
  try {
    await livekit.setScreenShare(input);
  } catch (e) {
    if (e instanceof LivekitError && e.code === 'not_found') throw notFound('participant_not_found');
    if (e instanceof LivekitError) throw new BadGatewayException({ code: 'livekit_error', message: e.message });
    throw e;
  }
}

/** Nothing is stored: the share permission lives on the LiveKit participant and ends with it. */
@Injectable()
export class ShareGrantService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly moderation: ModerationRepo,
    private readonly livekit: LivekitApi,
  ) {}

  /** 204; 400 body, 404 participant_not_found, 403 cannot_grant_share, 503, 502. */
  async lesson(input: ShareGrantInput): Promise<void> {
    assertConfigured(this.livekit);
    const { allow } = input;
    const { lesson, role } = await this.roles.resolve(input.user, input.id);
    const target = await this.moderation.participant(lesson.id, input.identity);
    if (!target) throw notFound('participant_not_found');
    if (!canGrantShare(role, asJoinRole(target.role))) throw cannotGrant();
    await applyShare(this.livekit, { room: lessonRoomName(lesson.id), identity: target.identity, allow });
  }
}

/** The same in an internal meeting: the target's role is the one in its server-minted identity. */
@Injectable()
export class MeetingShareGrantService {
  constructor(
    private readonly meetings: InternalMeetingsRepo,
    private readonly livekit: LivekitApi,
  ) {}

  /** 204; 400, 404 meeting_not_found / participant_not_found, 403, 503, 502. */
  async meeting(input: ShareGrantInput): Promise<void> {
    assertConfigured(this.livekit);
    const { allow } = input;
    const meeting = await this.meetings.byId(input.id);
    if (!meeting) throw notFound('meeting_not_found');
    const role = meetingRoleOf(input.user, meeting);
    if (!role) throw new ForbiddenException();
    const target = roleOfIdentity(input.identity);
    if (!target) throw notFound('participant_not_found');
    if (!canGrantShare(role, target)) throw cannotGrant();
    await applyShare(this.livekit, { room: meetingRoomName(meeting.id), identity: input.identity, allow });
  }
}
