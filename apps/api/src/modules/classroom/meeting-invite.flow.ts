import {
  MAX_DAILY_WHATSAPP_INVITES,
  MAX_MEETING_INVITEES,
  meetingWindow,
  type JoinWindowConfig,
  type MeetingInviteResult,
} from '@ab/shared';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { CLASSROOM_WEB_ORIGIN } from './classroom.config';
import type { MeetingRow } from './internal-meetings.queries';
import { hashMeetingToken, newMeetingToken } from './internal-meetings.token';
import { MeetingInviteSender, type DeliveryOutcome } from './meeting-invite.sender';
import { inviteDedupKey, invitationText, inviteSubject, whenText } from './meeting-invite.text';
import type { ResolvedInvitee } from './meeting-invitee.resolver';
import { MeetingInviteesQueries, type StoredInvitee } from './meeting-invitees.queries';
import { toInviteeView } from './meeting-invites.mapper';

const DAY_MS = 86_400_000;

export interface InviteRun {
  meeting: MeetingRow;
  actorId: string;
  invitees: readonly ResolvedInvitee[];
  win: JoinWindowConfig;
  now: Date;
}

/** One non-staff delivery: a fresh personal link, its chat text, its dedup key. */
export interface PersonalSend {
  run: Omit<InviteRun, 'invitees'>;
  invitee: StoredInvitee;
  dedupKey?: string;
}

/**
 * Invites people to a meeting (R-MEET-02): drops the ones already invited, enforces 30 invitees per
 * meeting (400 too_many_invitees) and 100 WhatsApp invitations per login per day (409 invite_limit),
 * stores one row each (non-staff: only the sha256 of a personal /m/<token>), delivers, and answers one
 * result per recipient; a non-staff result carries its link and invitation text, once.
 */
@Injectable()
export class MeetingInviteFlow {
  constructor(
    private readonly invitees: MeetingInviteesQueries,
    private readonly sender: MeetingInviteSender,
    @Inject(CLASSROOM_WEB_ORIGIN) private readonly origin: string,
  ) {}

  async invite(run: InviteRun): Promise<MeetingInviteResult[]> {
    const existing = await this.invitees.forMeeting(run.meeting.id);
    const taken = new Set(existing.flatMap((e) => [e.profile_id, e.phone_e164]).filter((k) => k !== null));
    const fresh = run.invitees.filter((i) => !taken.has(i.profileId ?? i.phone ?? ''));
    if (existing.filter((e) => e.status !== 'cancelled').length + fresh.length > MAX_MEETING_INVITEES) {
      throw new BadRequestException({ code: 'too_many_invitees', message: 'too_many_invitees' });
    }
    await this.assertDailyLimit({ actorId: run.actorId, now: run.now, adding: fresh.filter((i) => i.kind !== 'staff').length });
    const rows = await this.invitees.insert(fresh.map((i) => this.rowOf(run, i)));
    const results: MeetingInviteResult[] = [];
    for (const invitee of rows) {
      if (invitee.kind === 'staff') results.push(await this.staff({ run, invitee }));
      else results.push(await this.personal({ run, invitee }));
    }
    this.kickIfSent(results);
    return results;
  }

  /** One sender pass for every chat row just queued. */
  kickIfSent(results: readonly MeetingInviteResult[]): void {
    if (results.some((r) => r.channel === 'whatsapp' && r.status === 'sent')) this.sender.kick();
  }

  /** The /m/<token> URL of a meeting or personal token. */
  linkOf(token: string): string {
    return `${this.origin}/m/${token}`;
  }

  /** A fresh personal link (the previous one stops working), its chat text when a window is open. */
  async personal(p: PersonalSend): Promise<MeetingInviteResult> {
    const { meeting, now } = p.run;
    const phone = p.invitee.phone_e164 ?? '';
    const token = newMeetingToken();
    await this.invitees.update(p.invitee.id, { token_hash: hashMeetingToken(token) });
    const link = this.linkOf(token);
    const body = invitationText({ title: meeting.title, when: whenText(meeting.starts_at, p.invitee.tz), link });
    const dedupKey = p.dedupKey ?? inviteDedupKey({ meetingId: meeting.id, phone, startsAt: meeting.starts_at });
    const out = await this.sender.chat({ phone, body, dedupKey, actorId: p.run.actorId, expiresAt: this.expiry(p.run), now });
    return { ...(await this.record(p.invitee, out, now)), link, invitation_text: body };
  }

  async assertDailyLimit(v: { actorId: string; now: Date; adding: number }): Promise<void> {
    if (v.adding === 0) return;
    const used = await this.invitees.whatsappSince(v.actorId, new Date(v.now.getTime() - DAY_MS).toISOString());
    if (used + v.adding > MAX_DAILY_WHATSAPP_INVITES) throw new ConflictException({ code: 'invite_limit', message: 'invite_limit' });
  }

  /** The bell row (subject: the meeting and its time, or a resend's own). */
  async staff(p: PersonalSend): Promise<MeetingInviteResult> {
    const { meeting, now } = p.run;
    const subject = p.dedupKey ?? inviteSubject(meeting.id, meeting.starts_at);
    const out = await this.sender.staff({ meeting, invitee: p.invitee, subject });
    return { ...(await this.record(p.invitee, out, now)), link: null, invitation_text: null };
  }

  private async record(invitee: StoredInvitee, out: DeliveryOutcome, now: Date) {
    const sent_at = out.status === 'sent' ? now.toISOString() : null;
    await this.invitees.update(invitee.id, { ...out, sent_at });
    return toInviteeView({ ...invitee, ...out, sent_at });
  }

  /** A queued chat row is dropped once stale: a day at most, never after the room closes. */
  private expiry(run: Omit<InviteRun, 'invitees'>): string {
    const day = run.now.getTime() + DAY_MS;
    const closes = meetingWindow(run.meeting, run.now, run.win)?.closes_at;
    return new Date(closes ? Math.min(day, Date.parse(closes)) : day).toISOString();
  }

  private rowOf(run: InviteRun, i: ResolvedInvitee) {
    return {
      meeting_id: run.meeting.id,
      kind: i.kind,
      profile_id: i.profileId,
      student_id: i.studentId,
      phone_e164: i.phone,
      display_name: i.displayName.slice(0, 120),
      tz: i.tz,
      channel: i.kind === 'staff' ? 'in_app' : 'whatsapp',
      status: 'pending',
      created_by: run.actorId,
    };
  }
}
