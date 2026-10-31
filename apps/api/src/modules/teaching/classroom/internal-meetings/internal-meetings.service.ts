import { meetingRoomName, meetingState, meetingWindow, type JoinWindowConfig, type MeetingCreated } from '@ab/shared';
import { ConflictException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { CLASSROOM_WEB_ORIGIN } from '../classroom.config';
import { meetingEnded } from './internal-meetings.join.service';
import { InternalMeetingsQueries, type MeetingRow } from './internal-meetings.queries';
import { canManageMeeting, hashMeetingToken, newMeetingToken } from './internal-meetings.token';
import { LivekitApi } from '../livekit/livekit-api';

/**
 * «اجتماع داخلي» (POST /meetings/:id/end, POST /meetings/:id/link): «إنهاء» and «رابط جديد». Creating
 * (MeetingCreateService), listing (MeetingListService) and scheduling (MeetingScheduleService) live
 * apart. No LiveKit call on creation, so it works even before the classroom server is configured.
 */
@Injectable()
export class InternalMeetingsService {
  private readonly log = new Logger(InternalMeetingsService.name);

  constructor(
    private readonly queries: InternalMeetingsQueries,
    private readonly livekit: LivekitApi,
    @Inject(CLASSROOM_WEB_ORIGIN) private readonly origin: string,
  ) {}

  /**
   * 404 meeting_not_found, 403 not the creator nor an admin, 409 meeting_not_started for a scheduled
   * meeting whose window has not opened (reschedule or cancel it instead). Idempotent; the room is
   * closed for everyone inside.
   */
  async end(input: { user: AuthUser; id: string }, now = new Date()): Promise<void> {
    const row = await this.managed(input);
    const early = !row.ends_at && !row.cancelled_at && meetingWindow(row, now, await this.queries.joinWindow())?.state === 'early';
    if (early) throw new ConflictException({ code: 'meeting_not_started', message: 'meeting_not_started' });
    await this.queries.end(input.id, now.toISOString());
    this.closeRoom(input.id, now);
  }

  /** Closes the LiveKit room for everyone inside («إنهاء», a cancellation); never throws, never waits. */
  closeRoom(id: string, now: Date): void {
    if (!this.livekit.configured) return;
    const room = meetingRoomName(id);
    this.livekit
      .deleteRoom(room, now)
      .catch((e: unknown) => this.log.warn(`delete room ${room}: ${String(e)}`));
  }

  /** «رابط جديد»: a fresh link replaces the old one (only the hash is stored, so the URL cannot be shown again). 410 once ended. */
  async newLink(input: { user: AuthUser; id: string }, now = new Date()): Promise<MeetingCreated> {
    const row = await this.managed(input);
    if (meetingState(row, now, await this.queries.joinWindow()) === 'ended') throw meetingEnded();
    const token = newMeetingToken();
    await this.queries.rotate(input.id, hashMeetingToken(token));
    return { id: input.id, url: this.urlOf(token) };
  }

  /** managed, and still open: 410 meeting_ended once ended, cancelled or past its window. */
  async managedOpen(input: { user: AuthUser; id: string }, now: Date): Promise<{ row: MeetingRow; win: JoinWindowConfig }> {
    const row = await this.managed(input);
    const win = await this.queries.joinWindow();
    if (meetingState(row, now, win) === 'ended') throw meetingEnded();
    return { row, win };
  }

  async managed(input: { user: AuthUser; id: string }): Promise<MeetingRow> {
    const row = await this.queries.byId(input.id);
    if (!row) throw notFound('meeting_not_found');
    if (!canManageMeeting(input.user, row)) throw new ForbiddenException();
    return row;
  }

  private urlOf(token: string): string {
    return `${this.origin}/m/${token}`;
  }
}
