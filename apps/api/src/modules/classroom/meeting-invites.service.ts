import {
  addMeetingInviteesSchema,
  meetingInviteeOptionsQuerySchema,
  resendMeetingInviteSchema,
  type MeetingInviteeOption,
  type MeetingInviteeView,
  type MeetingInviteResult,
  mayInvitePhones,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../../common/http/errors';
import { parseOrThrow } from '../../common/http/http';
import { InternalMeetingsService } from './internal-meetings.service';
import { MeetingInviteFlow } from './meeting-invite.flow';
import { visibleView } from './meeting-invite.policy';
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
 * and role, students by name and code within what the caller may already see. Never a phone. Who may
 * send WhatsApp through all of it: InvitePolicy (meeting-invite.policy.ts).
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
    const seesAll = mayInvitePhones(t.user.role);
    return (await this.deps.invitees.forMeeting(t.id)).map((r) => visibleView(toInviteeView(r), seesAll));
  }

  async add(t: Target & { body: unknown }, now = new Date()): Promise<MeetingInviteResult[]> {
    const { invitees } = parseOrThrow(addMeetingInviteesSchema, t.body);
    const { row, win } = await this.meetings.managedOpen(t, now);
    const resolved = await this.deps.resolver.resolve({ user: t.user, invitees });
    const policy = await this.deps.resolver.policy(t.user);
    return this.flow.invite({ meeting: row, actorId: t.user.id, invitees: resolved, win, now, policy });
  }

  /**
   * «أعد الإرسال»: staff get the bell row again; anyone else a NEW personal link (only theirs is
   * replaced) and, when the caller may chat and the window is open, the chat text again. A retried
   * request id whose text was already queued sends and rotates nothing (the answer has no link); one
   * that queued nothing (window_closed, chat_not_allowed, invite_limit) returns a fresh link to copy.
   * Only whom add() would let the caller invite: a typed phone admin / sales (403), a student in scope (404).
   */
  async resend(t: Target & { inviteeId: string; body: unknown }, now = new Date()): Promise<MeetingInviteResult> {
    const { clientRequestId } = parseOrThrow(resendMeetingInviteSchema, t.body);
    const { row, win } = await this.meetings.managedOpen(t, now);
    const invitee = await this.deps.invitees.byId(row.id, t.inviteeId);
    if (!invitee || invitee.status === 'cancelled') throw notFound('invitee_not_found');
    await this.deps.resolver.assertMayReach(t.user, invitee);
    const policy = await this.deps.resolver.policy(t.user);
    const run = { meeting: row, actorId: t.user.id, win, now, policy };
    if (invitee.kind === 'staff') {
      return this.flow.staff({ run, invitee, dedupKey: `${inviteSubject(row.id, row.starts_at)}:resend:${clientRequestId}` });
    }
    const v = { meetingId: row.id, phone: invitee.phone_e164 ?? '', startsAt: row.starts_at };
    const dedupKey = resendDedupKey(v, clientRequestId);
    if (!policy.mayChat(v.phone)) return this.flow.personal({ run, invitee, dedupKey });
    if (await this.deps.invitees.queued(dedupKey)) return { ...visibleView(toInviteeView(invitee), policy.seesAll), link: null, invitation_text: null };
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
