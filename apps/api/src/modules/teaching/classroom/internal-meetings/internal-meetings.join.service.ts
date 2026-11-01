import { guestJoinSchema, meetingRoomName, meetingState, meetingWindow, type JoinRole, type PublicMeetingView, type RoomJoinResult } from '@ab/shared';
import { ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { parseOrThrow } from '@/common/http/http';
import { assertWindowOpen } from '@/modules/teaching/classroom/join/join-gate';
import { InternalMeetingsRepo, type MeetingRow } from './internal-meetings.repo';
import { hashMeetingToken, looksLikeMeetingToken, meetingRoleOf } from './internal-meetings.token';
import { PublicJoinLimit } from '@/modules/teaching/classroom/join/join-limit';
import { mintToken, newIdentity } from '@/modules/teaching/classroom/livekit/livekit-token';
import { meetingTarget } from '@/modules/teaching/classroom/recordings/recording-target';
import { RoomAdmission } from '@/modules/teaching/classroom/join/room-admission';

/** 410 meeting_ended: «إنهاء» was pressed, or the row was revoked. */
export const meetingEnded = (): HttpException => new HttpException({ code: 'meeting_ended', message: 'meeting_ended' }, HttpStatus.GONE);

/**
 * Entering «اجتماع داخلي»: staff with their login (POST /meetings/:id/join), anyone with the link
 * and a name (POST /public/meetings/:token/join, as a guest). A fresh identity per call, like the
 * lesson rooms. Every join makes sure the meeting is recorded (like a lesson, migration 212); nobody
 * is blocked: no classroom_participants row.
 */
@Injectable()
export class InternalMeetingJoinService {
  constructor(
    private readonly queries: InternalMeetingsRepo,
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
    await this.assertOpen(meeting, now);
    const name = ((await this.queries.profileName(input.user.id)) ?? role).slice(0, 30);
    return this.mint({ meeting, role, name }, now);
  }

  /**
   * GET /meetings/by-link/:token (staff login): the meeting behind a shared link, so a signed-in
   * staff member who opens /m/<token> enters with their own role (pen, board, screen share), never
   * as a guest. 404 link_invalid, 403 no staff role in it.
   */
  async idByLink(input: { user: AuthUser; token: string }): Promise<{ id: string }> {
    const meeting = await this.byToken(input.token);
    if (!meetingRoleOf(input.user, meeting)) throw new ForbiddenException();
    return { id: meeting.id };
  }

  /** GET /public/meetings/:token (no login): 404 link_invalid, 429. Never touches LiveKit. */
  async view(input: { token: string; ip: string }, now = new Date()): Promise<PublicMeetingView> {
    this.limit.assertRead({ ip: input.ip, token: input.token }, now.getTime());
    const meeting = await this.byToken(input.token);
    const win = await this.queries.joinWindow();
    const opens = meetingWindow(meeting, now, win)?.opens_at ?? null;
    return { title: meeting.title, state: meetingState(meeting, now, win), starts_at: meeting.starts_at, opens_at: opens };
  }

  /** 429, 503 classroom_not_configured, 400 name, 404 link_invalid, 410 meeting_ended. */
  async guest(input: { token: string; ip: string; body: unknown }, now = new Date()): Promise<RoomJoinResult> {
    this.limit.assert({ ip: input.ip, token: input.token }, now.getTime());
    this.admission.livekit();
    const { name } = parseOrThrow(guestJoinSchema, input.body);
    const meeting = await this.byToken(input.token);
    await this.assertOpen(meeting, now);
    return this.mint({ meeting, role: 'guest', name }, now);
  }

  /**
   * 410 meeting_ended once ended / cancelled / revoked; a scheduled meeting also follows the lesson
   * window (R-MEET-01): 403 join_not_open_yet (with opens_at) before it, 410 join_closed after it.
   */
  private async assertOpen(meeting: MeetingRow, now: Date): Promise<void> {
    if (meetingState({ ...meeting, starts_at: null, planned_end_at: null }, now) === 'ended') throw meetingEnded();
    if (meeting.starts_at && meeting.planned_end_at) {
      assertWindowOpen({ starts_at: meeting.starts_at, ends_at: meeting.planned_end_at }, now, await this.queries.joinWindow());
    }
  }

  /** The shared link, or an invitee's personal link (migration 411). */
  private async byToken(token: string): Promise<MeetingRow> {
    if (!looksLikeMeetingToken(token)) throw notFound('link_invalid');
    const hash = hashMeetingToken(token);
    const meeting = (await this.queries.byHash(hash)) ?? (await this.queries.byInviteHash(hash));
    if (!meeting) throw notFound('link_invalid');
    return meeting;
  }

  private mint(input: { meeting: MeetingRow; role: JoinRole; name: string }, now: Date): RoomJoinResult {
    const config = this.admission.livekit();
    const room = meetingRoomName(input.meeting.id);
    const identity = newIdentity(input.role);
    const token = mintToken(config, { room, role: input.role, name: input.name, identity }, now);
    this.admission.record(meetingTarget(input.meeting.id), now);
    return { url: config.url, token, room, role: input.role, recording: this.admission.recordingState };
  }
}
