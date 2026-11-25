import { canRemove, meetingRoomName } from '@ab/schedule';
import { BadGatewayException, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { InternalMeetingsRepo } from './internal-meetings.repo';
import { meetingRoleOf, roleOfIdentity } from './internal-meetings.token';
import { notConfigured } from '@/modules/teaching/classroom/join/join-gate';
import { LivekitApi, LivekitError } from '@/modules/teaching/classroom/livekit/livekit-api';

/** Removal has no persistent block: the guest link is shared, so a removed guest may return. */
@Injectable()
export class InternalMeetingKickService {
  constructor(
    private readonly queries: InternalMeetingsRepo,
    private readonly livekit: LivekitApi,
  ) {}

  /** 503, 404 meeting_not_found / participant_not_found, 403 cannot_remove, 502 LiveKit refused. */
  async remove(input: { user: AuthUser; id: string; identity: string }): Promise<void> {
    if (!this.livekit.configured) throw notConfigured();
    const meeting = await this.queries.byId(input.id);
    if (!meeting) throw notFound('meeting_not_found');
    const role = meetingRoleOf(input.user, meeting);
    if (!role) throw new ForbiddenException();
    const target = roleOfIdentity(input.identity);
    if (!target) throw notFound('participant_not_found');
    if (!canRemove(role, target)) throw new HttpException({ code: 'cannot_remove', message: 'cannot_remove' }, HttpStatus.FORBIDDEN);
    try {
      await this.livekit.removeParticipant({ room: meetingRoomName(meeting.id), identity: input.identity });
    } catch (e) {
      if (e instanceof LivekitError) throw new BadGatewayException({ code: 'livekit_error', message: e.message });
      throw e;
    }
  }
}
