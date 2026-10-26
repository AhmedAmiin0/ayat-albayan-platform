import { canMute, JOIN_ROLES, lessonRoomName, meetingRoomName, muteSchema, type JoinRole, type MuteSource } from '@ab/shared';
import { BadGatewayException, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { parseOrThrow } from '../../../../common/http/http';
import { InternalMeetingsQueries } from '../internal-meetings/internal-meetings.queries';
import { meetingRoleOf, roleOfIdentity } from '../internal-meetings/internal-meetings.token';
import { notConfigured } from '../join/join-gate';
import { LessonRoleService } from '../join/lesson-role.service';
import { LivekitApi, LivekitError } from '../livekit/livekit-api';
import { muteTrack } from '../livekit/livekit-api.mute';
import { ModerationQueries } from './moderation.queries';

interface MuteInput {
  user: AuthUser;
  /** The lesson id, or the internal meeting id. */
  id: string;
  identity: string;
  body: unknown;
}

const cannotMute = (): HttpException => new HttpException({ code: 'cannot_mute', message: 'cannot_mute' }, HttpStatus.FORBIDDEN);
const asJoinRole = (role: string): JoinRole | null => JOIN_ROLES.find((r) => r === role) ?? null;

function checkBody(livekit: LivekitApi, body: unknown): MuteSource {
  if (!livekit.configured) throw notConfigured();
  return parseOrThrow(muteSchema, body).source;
}

async function applyMute(livekit: LivekitApi, input: { room: string; identity: string; source: MuteSource }): Promise<void> {
  try {
    await muteTrack(livekit, input);
  } catch (e) {
    if (e instanceof LivekitError && e.code === 'not_found') throw notFound('participant_not_found');
    if (e instanceof LivekitError) throw new BadGatewayException({ code: 'livekit_error', message: e.message });
    throw e;
  }
}

/**
 * «كتم الميكروفون» / «إيقاف الكاميرا» in a lesson room: the teacher, an admin or an assistant of that
 * lesson mutes someone below them (canMute). LiveKit mutes the published track server-side; the
 * participant may turn it back on. Nothing stored.
 */
@Injectable()
export class MuteService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly moderation: ModerationQueries,
    private readonly livekit: LivekitApi,
  ) {}

  /** 204; 400 body, 404 participant_not_found, 403 cannot_mute, 503, 502. */
  async lesson(input: MuteInput): Promise<void> {
    const source = checkBody(this.livekit, input.body);
    const { lesson, role } = await this.roles.resolve(input.user, input.id);
    const target = await this.moderation.participant(lesson.id, input.identity);
    if (!target) throw notFound('participant_not_found');
    if (!canMute(role, asJoinRole(target.role))) throw cannotMute();
    await applyMute(this.livekit, { room: lessonRoomName(lesson.id), identity: target.identity, source });
  }
}

/** The same in an internal meeting: the target's role is the one in its server-minted identity. */
@Injectable()
export class MeetingMuteService {
  constructor(
    private readonly meetings: InternalMeetingsQueries,
    private readonly livekit: LivekitApi,
  ) {}

  /** 204; 400, 404 meeting_not_found / participant_not_found, 403, 503, 502. */
  async meeting(input: MuteInput): Promise<void> {
    const source = checkBody(this.livekit, input.body);
    const meeting = await this.meetings.byId(input.id);
    if (!meeting) throw notFound('meeting_not_found');
    const role = meetingRoleOf(input.user, meeting);
    if (!role) throw new ForbiddenException();
    const target = roleOfIdentity(input.identity);
    if (!target) throw notFound('participant_not_found');
    if (!canMute(role, target)) throw cannotMute();
    await applyMute(this.livekit, { room: meetingRoomName(meeting.id), identity: input.identity, source });
  }
}
