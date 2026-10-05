import { createMeetingSchema, DEFAULT_MEETING_TITLE, meetingRoomName, meetingState, type MeetingCreated, type MeetingView } from '@ab/shared';
import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { parseOrThrow } from '../teachers/http';
import { CLASSROOM_WEB_ORIGIN } from './classroom.config';
import { InternalMeetingsQueries, type MeetingRow } from './internal-meetings.queries';
import { canManageMeeting, hashMeetingToken, newMeetingToken } from './internal-meetings.token';
import { LivekitApi } from './livekit-api';

/**
 * «اجتماع داخلي» (POST /meetings, GET /meetings, POST /meetings/:id/end, POST /meetings/:id/link):
 * a standalone room any staff login creates for internal talks. No LiveKit call on creation, so it
 * works (and the link is shown) even before the classroom server is configured.
 */
@Injectable()
export class InternalMeetingsService {
  private readonly log = new Logger(InternalMeetingsService.name);

  constructor(
    private readonly queries: InternalMeetingsQueries,
    private readonly livekit: LivekitApi,
    @Inject(CLASSROOM_WEB_ORIGIN) private readonly origin: string,
  ) {}

  async create(input: { user: AuthUser; body: unknown }): Promise<MeetingCreated> {
    const { title } = parseOrThrow(createMeetingSchema, input.body ?? {});
    const token = newMeetingToken();
    const row = await this.queries.insert({ title: title ?? DEFAULT_MEETING_TITLE, createdBy: input.user.id, hash: hashMeetingToken(token) });
    return { id: row.id, url: this.urlOf(token) };
  }

  /** The newest 20: all of them for an admin, else the caller's own. */
  async list(user: AuthUser, now = new Date()): Promise<MeetingView[]> {
    const rows = await this.queries.latest(user.role === 'admin' ? null : user.id);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      created_by: r.created_by,
      created_at: r.created_at,
      ends_at: r.ends_at,
      state: meetingState(r, now),
      can_manage: canManageMeeting(user, r),
    }));
  }

  /** 404 meeting_not_found, 403 not the creator nor an admin. Idempotent; the room is closed for everyone inside. */
  async end(input: { user: AuthUser; id: string }, now = new Date()): Promise<void> {
    await this.managed(input);
    await this.queries.end(input.id, now.toISOString());
    if (!this.livekit.configured) return;
    const room = meetingRoomName(input.id);
    this.livekit
      .call({ method: 'livekit.RoomService/DeleteRoom', body: { room }, grant: { roomCreate: true } }, now)
      .catch((e: unknown) => this.log.warn(`delete room ${room}: ${String(e)}`));
  }

  /** «رابط جديد»: a fresh link replaces the old one (only the hash is stored, so the URL cannot be shown again). */
  async newLink(input: { user: AuthUser; id: string }): Promise<MeetingCreated> {
    await this.managed(input);
    const token = newMeetingToken();
    await this.queries.rotate(input.id, hashMeetingToken(token));
    return { id: input.id, url: this.urlOf(token) };
  }

  private async managed(input: { user: AuthUser; id: string }): Promise<MeetingRow> {
    const row = await this.queries.byId(input.id);
    if (!row) throw notFound('meeting_not_found');
    if (!canManageMeeting(input.user, row)) throw new ForbiddenException();
    return row;
  }

  private urlOf(token: string): string {
    return `${this.origin}/m/${token}`;
  }
}
