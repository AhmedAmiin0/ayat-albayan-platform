import { guestJoinSchema, meetingRoomName, meetingState, type JoinRole, type PublicMeetingView, type RoomJoinResult } from '@ab/shared';
import { ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { parseOrThrow } from '../teachers/http';
import { InternalMeetingsQueries, type MeetingRow } from './internal-meetings.queries';
import { hashMeetingToken, looksLikeMeetingToken, meetingRoleOf } from './internal-meetings.token';
import { PublicJoinLimit } from './join-limit';
import { mintToken, newIdentity } from './livekit-token';
import { RoomAdmission } from './room-admission';

/** 410 meeting_ended: «إنهاء» was pressed, or the row was revoked. */
export const meetingEnded = (): HttpException => new HttpException({ code: 'meeting_ended', message: 'meeting_ended' }, HttpStatus.GONE);

/**
 * Entering «اجتماع داخلي»: staff with their login (POST /meetings/:id/join), anyone with the link
 * and a name (POST /public/meetings/:token/join, as a guest). A fresh identity per call, like the
 * lesson rooms. Nothing is recorded and nobody is blocked: no classroom_participants row.
 */
@Injectable()
export class InternalMeetingJoinService {
  constructor(
    private readonly queries: InternalMeetingsQueries,
    private readonly limit: PublicJoinLimit,
    private readonly admission: RoomAdmission,
  ) {}

  /** 503 classroom_not_configured, 404 meeting_not_found, 410 meeting_ended, 403 no staff role. */
  async staff(input: { user: AuthUser; id: string }, now = new Date()): Promise<RoomJoinResult> {
    this.admission.livekit();
    const meeting = await this.queries.byId(input.id);
    if (!meeting) throw notFound('meeting_not_found');
    const role = meetingRoleOf(input.user, meeting);
    if (!role) throw new ForbiddenException();
    if (meetingState(meeting, now) === 'ended') throw meetingEnded();
    const name = ((await this.queries.profileName(input.user.id)) ?? role).slice(0, 30);
    return this.mint({ meeting, role, name }, now);
  }

  /** GET /public/meetings/:token (no login): 404 link_invalid, 429. Never touches LiveKit. */
  async view(input: { token: string; ip: string }, now = new Date()): Promise<PublicMeetingView> {
    this.limit.assertRead({ ip: input.ip, token: input.token }, now.getTime());
    const meeting = await this.byToken(input.token);
    return { title: meeting.title, state: meetingState(meeting, now) };
  }

  /** 429, 503 classroom_not_configured, 400 name, 404 link_invalid, 410 meeting_ended. */
  async guest(input: { token: string; ip: string; body: unknown }, now = new Date()): Promise<RoomJoinResult> {
    this.limit.assert({ ip: input.ip, token: input.token }, now.getTime());
    this.admission.livekit();
    const { name } = parseOrThrow(guestJoinSchema, input.body);
    const meeting = await this.byToken(input.token);
    if (meetingState(meeting, now) === 'ended') throw meetingEnded();
    return this.mint({ meeting, role: 'guest', name }, now);
  }

  private async byToken(token: string): Promise<MeetingRow> {
    if (!looksLikeMeetingToken(token)) throw notFound('link_invalid');
    const meeting = await this.queries.byHash(hashMeetingToken(token));
    if (!meeting) throw notFound('link_invalid');
    return meeting;
  }

  private mint(input: { meeting: MeetingRow; role: JoinRole; name: string }, now: Date): RoomJoinResult {
    const config = this.admission.livekit();
    const room = meetingRoomName(input.meeting.id);
    const identity = newIdentity(input.role);
    const token = mintToken(config, { room, role: input.role, name: input.name, identity }, now);
    return { url: config.url, token, room, role: input.role };
  }
}
