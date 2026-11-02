import { createMeetingSchema, mayInvitePhones, type MeetingCreateResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { InternalMeetingsRepo, type MeetingRow } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.repo';
import { hashMeetingToken, newMeetingToken } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.token';
import { chatCount, MeetingInviteFlow } from '@/modules/teaching/classroom/meetings/invites/meeting-invite.flow';
import { visibleView } from '@/modules/teaching/classroom/meetings/invites/meeting-invite.policy';
import { MeetingInviteeResolver } from '@/modules/teaching/classroom/meetings/invites/meeting-invitee.resolver';
import { MeetingInviteesRepo } from '@/modules/teaching/classroom/meetings/invites/meeting-invitees.repo';
import { toInviteeView } from '@/modules/teaching/classroom/meetings/invites/meeting-invites.mapper';
import { scheduleTimes } from './meeting-schedule.rules';

/** The services MeetingCreateService talks to (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class MeetingCreateDeps {
  constructor(
    readonly resolver: MeetingInviteeResolver,
    readonly flow: MeetingInviteFlow,
    readonly invitees: MeetingInviteesRepo,
  ) {}
}

/**
 * POST /meetings (R-MEET-01/02): an instant meeting (no startsAt, exactly as before) or a scheduled
 * one, with invitees. Everything is checked before the row exists (times, invitees, the daily
 * limit); a retried clientRequestId (rule 8) returns the first meeting with a fresh shared link and
 * the invitees' current results, sending nothing again (their personal links are not shown twice).
 */
@Injectable()
export class MeetingCreateService {
  constructor(
    private readonly queries: InternalMeetingsRepo,
    private readonly deps: MeetingCreateDeps,
  ) {}

  async create(input: { user: AuthUser; body: unknown }, now = new Date()): Promise<MeetingCreateResult> {
    const { user } = input;
    const body = parseOrThrow(createMeetingSchema, input.body ?? {});
    const times = scheduleTimes(body, now);
    const requestId = body.clientRequestId ?? null;
    const prior = requestId ? await this.queries.byRequest(user.id, requestId) : null;
    if (prior) return this.replay(prior, user);
    const invitees = await this.deps.resolver.resolve({ user, invitees: body.invitees ?? [] });
    const policy = await this.deps.resolver.policy(user);
    await this.deps.flow.assertDailyLimit({ actorId: user.id, now, adding: chatCount(invitees, policy) });
    const token = newMeetingToken();
    const title = body.title ?? (await this.queries.defaultTitle());
    const row = await this.queries.insert({ title, createdBy: user.id, hash: hashMeetingToken(token), ...times, clientRequestId: requestId });
    if (!row) return this.replay(await this.byRequestOrFail(user.id, requestId), user);
    const win = await this.queries.joinWindow();
    const results = await this.deps.flow.invite({ meeting: row, actorId: user.id, invitees, win, now, policy });
    return { id: row.id, url: this.deps.flow.linkOf(token), invitees: results, replayed: false };
  }

  private async replay(meeting: MeetingRow, user: AuthUser): Promise<MeetingCreateResult> {
    const token = newMeetingToken();
    await this.queries.rotate(meeting.id, hashMeetingToken(token));
    const rows = await this.deps.invitees.forMeeting(meeting.id);
    const seesAll = mayInvitePhones(user.role);
    const invitees = rows.map((r) => ({ ...visibleView(toInviteeView(r), seesAll), link: null, invitation_text: null }));
    return { id: meeting.id, url: this.deps.flow.linkOf(token), invitees, replayed: true };
  }

  private async byRequestOrFail(userId: string, requestId: string | null): Promise<MeetingRow> {
    const row = requestId ? await this.queries.byRequest(userId, requestId) : null;
    if (!row) throw new Error('meeting insert returned no row');
    return row;
  }
}
