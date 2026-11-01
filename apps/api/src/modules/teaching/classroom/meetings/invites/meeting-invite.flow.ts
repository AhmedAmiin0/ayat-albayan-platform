import {
  MAX_DAILY_WHATSAPP_INVITES,
  MAX_MEETING_INVITEES,
  meetingWindow,
  type JoinWindowConfig,
  type MeetingInviteResult,
} from '@ab/shared';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { CLASSROOM_WEB_ORIGIN } from '@/modules/teaching/classroom/classroom.config';
import type { MeetingRow } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.repo';
import { hashMeetingToken, newMeetingToken } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.token';
import { CHAT_NOT_ALLOWED, visibleCode, type InvitePolicy } from './meeting-invite.policy';
import { MeetingInviteSender, type DeliveryOutcome } from './meeting-invite.sender';
import { inviteDedupKey, invitationText, inviteeWhen, inviteSubject } from './meeting-invite.text';
import type { ResolvedInvitee } from './meeting-invitee.resolver';
import { MeetingInviteesRepo, type StoredInvitee } from './meeting-invitees.repo';
import { toInviteeView } from './meeting-invites.mapper';

const DAY_MS = 86_400_000;

/** How many of these would queue a WhatsApp text (the daily limit counts only those). */
export const chatCount = (list: readonly ResolvedInvitee[], policy: InvitePolicy): number =>
  list.filter((i) => i.kind !== 'staff' && policy.mayChat(i.phone ?? '')).length;

interface InviteRun {
  meeting: MeetingRow;
  actorId: string;
  invitees: readonly ResolvedInvitee[];
  win: JoinWindowConfig;
  now: Date;
  /** What the caller may send (meeting-invite.policy.ts): no chat right = a link to copy, never WhatsApp. */
  policy: InvitePolicy;
}

const LINK_ONLY: DeliveryOutcome = { status: 'window_closed', channel: 'link', error_code: CHAT_NOT_ALLOWED };

/** One non-staff delivery: a fresh personal link, its chat text, its dedup key. */
interface PersonalSend {
  run: Omit<InviteRun, 'invitees'>;
  invitee: StoredInvitee;
  dedupKey?: string;
}

/**
 * Invites people to a meeting (R-MEET-02): drops the ones already invited, enforces 30 invitees per
 * meeting (400 too_many_invitees) and 100 WhatsApp invitations per login per day (409 invite_limit
 * from the fast check; migration 414's trigger fails only that recipient: failed / invite_limit + link),
 * stores one row each (non-staff: only the sha256 of a personal /m/<token>), delivers, and answers one
 * result per recipient; a non-staff result carries its link and invitation text, once.
 */
@Injectable()
export class MeetingInviteFlow {
  constructor(
    private readonly invitees: MeetingInviteesRepo,
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
    await this.assertDailyLimit({ actorId: run.actorId, now: run.now, adding: chatCount(fresh, run.policy) });
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

  /**
   * A fresh personal link (the old one stops working) and its chat text when the caller may chat and a
   * window is open; the link and the text to copy come back either way (chat_not_allowed, invite_limit).
   */
  async personal(p: PersonalSend): Promise<MeetingInviteResult> {
    const { meeting, now } = p.run;
    const phone = p.invitee.phone_e164 ?? '';
    const token = newMeetingToken();
    await this.invitees.update(p.invitee.id, { token_hash: hashMeetingToken(token) });
    const link = this.linkOf(token);
    const body = invitationText({ title: meeting.title, when: inviteeWhen(meeting.starts_at, p.invitee), link });
    const dedupKey = p.dedupKey ?? inviteDedupKey({ meetingId: meeting.id, phone, startsAt: meeting.starts_at });
    const { actorId, policy } = p.run;
    const out = policy.mayChat(phone)
      ? await this.sender.chat({ phone, body, dedupKey, actorId, teacherId: policy.teacherId, expiresAt: this.expiry(p.run), now })
      : LINK_ONLY;
    return { ...(await this.record(p.invitee, out, p.run)), link, invitation_text: body };
  }

  async assertDailyLimit(v: { actorId: string; now: Date; adding: number }): Promise<void> {
    if (v.adding === 0) return;
    const used = await this.invitees.whatsappSince(v.actorId, new Date(v.now.getTime() - DAY_MS).toISOString());
    if (used + v.adding > MAX_DAILY_WHATSAPP_INVITES) throw new ConflictException({ code: 'invite_limit', message: 'invite_limit' });
  }

  /** The bell row (subject: the meeting and its time, or a resend's own). */
  async staff(p: PersonalSend): Promise<MeetingInviteResult> {
    const { meeting } = p.run;
    const subject = p.dedupKey ?? inviteSubject(meeting.id, meeting.starts_at);
    const out = await this.sender.staff({ meeting, invitee: p.invitee, subject });
    return { ...(await this.record(p.invitee, out, p.run)), link: null, invitation_text: null };
  }

  /** The outcome on the row; a caller without scope 'all' never tells no_thread from session_closed. */
  private async record(invitee: StoredInvitee, raw: DeliveryOutcome, run: Omit<InviteRun, 'invitees'>) {
    const out = { ...raw, error_code: visibleCode(raw.error_code, run.policy.seesAll) };
    const sent_at = out.status === 'sent' ? run.now.toISOString() : null;
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
      channel: i.kind === 'staff' ? 'in_app' : run.policy.mayChat(i.phone ?? '') ? 'whatsapp' : 'link',
      status: 'pending',
      created_by: run.actorId,
    };
  }
}
