import {
  addMeetingInviteesSchema,
  meetingInviteeOptionsQuerySchema,
  resendMeetingInviteSchema,
  type MeetingInviteeOption,
  type MeetingInviteeView,
  type MeetingInviteResult,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { parseOrThrow } from '../teachers/http';
import { InternalMeetingsService } from './internal-meetings.service';
import { MeetingInviteFlow } from './meeting-invite.flow';
import { inviteSubject, resendDedupKey } from './meeting-invite.text';
import { MeetingInviteeQueries } from './meeting-invitee.queries';
import { MeetingInviteeResolver } from './meeting-invitee.resolver';
import { MeetingInviteesQueries } from './meeting-invitees.queries';
import { toInviteeView } from './meeting-invites.mapper';

/** What MeetingInvitesService reads (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class MeetingInvitesDeps {
  constructor(
    readonly resolver: MeetingInviteeResolver,
    readonly picks: MeetingInviteeQueries,
    readonly invitees: MeetingInviteesQueries,
  ) {}
}

type Target = { user: AuthUser; id: string };

/**
 * The invitees of a meeting (R-MEET-02): the list, «أضف مدعوين» and «أعد الإرسال» for its creator or an
 * admin (403; 410 once ended), and the picker's options for anyone with meetings.write: staff by name
 * and role, students by name and code within what the caller may already see. Never a phone.
 */
@Injectable()
export class MeetingInvitesService {
  constructor(
    private readonly meetings: InternalMeetingsService,
    private readonly flow: MeetingInviteFlow,
    private readonly deps: MeetingInvitesDeps,
  ) {}

  async list(t: Target): Promise<MeetingInviteeView[]> {
    await this.meetings.managed(t);
    return (await this.deps.invitees.forMeeting(t.id)).map(toInviteeView);
  }

  async add(t: Target & { body: unknown }, now = new Date()): Promise<MeetingInviteResult[]> {
    const { invitees } = parseOrThrow(addMeetingInviteesSchema, t.body);
    const { row, win } = await this.meetings.managedOpen(t, now);
    const resolved = await this.deps.resolver.resolve({ user: t.user, invitees });
    return this.flow.invite({ meeting: row, actorId: t.user.id, invitees: resolved, win, now });
  }

  /**
   * «أعد الإرسال»: staff get the bell row again; anyone else a NEW personal link (only theirs is
   * replaced) and, inside the window, the chat text again. A retried request id sends nothing new and
   * keeps the link already sent (no rotation), so the answer then has no link.
   */
  async resend(t: Target & { inviteeId: string; body: unknown }, now = new Date()): Promise<MeetingInviteResult> {
    const { clientRequestId } = parseOrThrow(resendMeetingInviteSchema, t.body);
    const { row, win } = await this.meetings.managedOpen(t, now);
    const invitee = await this.deps.invitees.byId(row.id, t.inviteeId);
    if (!invitee || invitee.status === 'cancelled') throw notFound('invitee_not_found');
    const run = { meeting: row, actorId: t.user.id, win, now };
    if (invitee.kind === 'staff') {
      return this.flow.staff({ run, invitee, dedupKey: `${inviteSubject(row.id, row.starts_at)}:resend:${clientRequestId}` });
    }
    const v = { meetingId: row.id, phone: invitee.phone_e164 ?? '', startsAt: row.starts_at };
    const dedupKey = resendDedupKey(v, clientRequestId);
    if (await this.deps.invitees.queued(dedupKey)) return { ...toInviteeView(invitee), link: null, invitation_text: null };
    await this.flow.assertDailyLimit({ actorId: t.user.id, now, adding: 1 });
    const result = await this.flow.personal({ run, invitee, dedupKey });
    this.flow.kickIfSent([result]);
    return result;
  }

  async options(user: AuthUser, query: unknown): Promise<MeetingInviteeOption[]> {
    const { q } = parseOrThrow(meetingInviteeOptionsQuerySchema, query);
    const scope = await this.deps.resolver.scopeOf(user);
    const [staff, students] = await Promise.all([
      this.deps.picks.staff({ ...(q ? { q } : {}) }),
      this.deps.picks.students({ scope, ...(q ? { q } : {}) }),
    ]);
    return [
      ...staff.filter((s) => s.id !== user.id).map((s): MeetingInviteeOption => ({ kind: 'staff', id: s.id, name: s.full_name, role: s.role })),
      ...students.map((s): MeetingInviteeOption => ({ kind: 'student', id: s.id, name: s.name, code: s.code ?? '' })),
    ];
  }
}
