import {
  addMeetingInviteesSchema,
  meetingInviteeOptionsQuerySchema,
  resendMeetingInviteSchema,
  type MeetingInviteeOption,
  type MeetingInviteeView,
  type MeetingInviteResult,
  mayInvitePhones,
} from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { parseOrThrow } from '@/common/http/http';
import { InternalMeetingsService } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.service';
import { MeetingInviteFlow } from './meeting-invite.flow';
import { visibleView } from './meeting-invite.policy';
import { inviteSubject, resendDedupKey } from './meeting-invite.text';
import { MeetingInviteeRepo } from './meeting-invitee.repo';
import { MeetingInviteeResolver } from './meeting-invitee.resolver';
import { MeetingInviteesRepo } from './meeting-invitees.repo';
import { toInviteeView } from './meeting-invites.mapper';

/** What MeetingInvitesService reads (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class MeetingInvitesDeps {
  constructor(
    readonly resolver: MeetingInviteeResolver,
    readonly picks: MeetingInviteeRepo,
    readonly invitees: MeetingInviteesRepo,
  ) {}
}

type Target = { user: AuthUser; id: string };

/** Meeting invitees (R-MEET-02): creator or admin only (403; 410 once ended); never a phone. */
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
    return (await this.deps.invitees.forMeeting(t.id)).map((r) =>
      visibleView(toInviteeView(r), seesAll),
    );
  }

  async add(t: Target & { body: unknown }, now = new Date()): Promise<MeetingInviteResult[]> {
    const { invitees } = parseOrThrow(addMeetingInviteesSchema, t.body);
    const { row, win } = await this.meetings.managedOpen(t, now);
    const resolved = await this.deps.resolver.resolve({ user: t.user, invitees });
    const policy = await this.deps.resolver.policy(t.user);
    return this.flow.invite({
      meeting: row,
      actorId: t.user.id,
      invitees: resolved,
      win,
      now,
      policy,
    });
  }

  /** Resend: a retried request id whose text was already queued sends and rotates nothing. */
  async resend(
    t: Target & { inviteeId: string; body: unknown },
    now = new Date(),
  ): Promise<MeetingInviteResult> {
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
    if (await this.deps.invitees.queued(dedupKey))
      return {
        ...visibleView(toInviteeView(invitee), policy.seesAll),
        link: null,
        invitation_text: null,
      };
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
