import { meetingState, type UpdateMeeting } from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { ar } from '@/common/infra/i18n/server-text';
import { meetingEnded } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.join.service';
import { InternalMeetingsRepo, type MeetingRow } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.repo';
import { InternalMeetingsService } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.service';
import { MeetingInviteSender } from '@/modules/teaching/classroom/meetings/invites/meeting-invite.sender';
import { cancelDedupKey, cancellationText, inviteeWhen, inviteSubject } from '@/modules/teaching/classroom/meetings/invites/meeting-invite.text';
import { MeetingInviteeResolver } from '@/modules/teaching/classroom/meetings/invites/meeting-invitee.resolver';
import { MeetingInviteesRepo, type StoredInvitee } from '@/modules/teaching/classroom/meetings/invites/meeting-invitees.repo';
import { rescheduleTimes } from './meeting-schedule.rules';

const HOUR_MS = 3_600_000;

/**
 * A family the cancellation may reach: its invitation found the window closed (it may be open now), or
 * one of its texts went out, whatever a later resend did (failed, invite_limit). Never a family that
 * never got the invitation (markStale only marks never-delivered phones, so a stale row never matches).
 */
const mayTell = (i: StoredInvitee, delivered: ReadonlySet<string>): boolean =>
  i.status === 'window_closed' || delivered.has(i.phone_e164 ?? '');

/** The invitation side of scheduling (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class MeetingScheduleDeps {
  constructor(
    readonly invitees: MeetingInviteesRepo,
    readonly sender: MeetingInviteSender,
    readonly resolver: MeetingInviteeResolver,
  ) {}
}

/** Same instant? '+00:00' (PostgREST) and '.000Z' (the API) spell one time two ways. */
export const sameInstant = (a: string | null, b: string | null): boolean => a !== null && b !== null && Date.parse(a) === Date.parse(b);

/** R-MEET-01: a real move re-notifies staff; cancelling twice is a no-op; ended answers 410. */
@Injectable()
export class MeetingScheduleService {
  constructor(
    private readonly meetings: InternalMeetingsService,
    private readonly queries: InternalMeetingsRepo,
    private readonly deps: MeetingScheduleDeps,
  ) {}

  async update(input: { user: AuthUser; id: string; patch: UpdateMeeting }, now = new Date()): Promise<void> {
    const { patch } = input;
    const { row } = await this.meetings.managedOpen(input, now);
    const times = rescheduleTimes(row, patch, now);
    const title = patch.title ?? row.title;
    await this.queries.update(row.id, {
      title,
      ...(times?.startsAt && times.plannedEndAt ? { starts_at: times.startsAt, planned_end_at: times.plannedEndAt } : {}),
    });
    if (!times?.startsAt || sameInstant(times.startsAt, row.starts_at)) return;
    await this.markStale(row.id, await this.deps.invitees.dropQueuedInvites(row.id));
    const meeting = { id: row.id, title, starts_at: times.startsAt };
    const subject = `${inviteSubject(row.id, times.startsAt)}:moved:${now.toISOString()}`;
    const pushTitle = ar.meetingInvites.push.rescheduled;
    for (const invitee of await this.staff(row.id)) {
      await this.deps.sender.staff({ meeting, invitee, subject, title: pushTitle });
    }
  }

  async cancel(input: { user: AuthUser; id: string }, now = new Date()): Promise<void> {
    const row = await this.meetings.managed(input);
    if (row.cancelled_at) return;
    if (row.ends_at || meetingState(row, now, await this.queries.joinWindow()) === 'ended') throw meetingEnded();
    if (!(await this.queries.cancel(row.id, now.toISOString()))) return;
    this.meetings.closeRoom(row.id, now);
    await this.deps.invitees.clearTokens(row.id);
    await this.deps.invitees.dropQueuedInvites(row.id);
    const delivered = await this.deps.invitees.deliveredPhones(row.id);
    const policy = await this.deps.resolver.policy(input.user);
    const all = await this.deps.invitees.forMeeting(row.id);
    const title = ar.meetingInvites.push.cancelled;
    let queued = false;
    for (const invitee of all.filter((i) => i.status !== 'cancelled')) {
      if (invitee.kind === 'staff') await this.deps.sender.staff({ meeting: row, invitee, subject: `cancel:${row.id}`, title });
      else if (mayTell(invitee, delivered) && invitee.phone_e164 && policy.mayChat(invitee.phone_e164)) {
        queued = (await this.tellFamily({ row, invitee, actorId: input.user.id, teacherId: policy.teacherId, now })) || queued;
      }
    }
    if (queued) this.deps.sender.kick();
  }

  private async staff(meetingId: string): Promise<StoredInvitee[]> {
    return (await this.deps.invitees.forMeeting(meetingId)).filter((i) => i.kind === 'staff' && i.status !== 'cancelled');
  }

  /** A new time dropped these phones' queued texts: an invitee none of whose texts went out reads failed / stale. */
  private async markStale(meetingId: string, dropped: readonly string[]): Promise<void> {
    if (dropped.length === 0) return;
    const delivered = await this.deps.invitees.deliveredPhones(meetingId);
    const stale = (await this.deps.invitees.forMeeting(meetingId)).filter(
      (i) => i.kind !== 'staff' && i.status !== 'cancelled' && dropped.includes(i.phone_e164 ?? '') && !delivered.has(i.phone_e164 ?? ''),
    );
    for (const i of stale) await this.deps.invitees.update(i.id, { status: 'failed', error_code: 'stale', sent_at: null });
  }

  /** The cancellation chat text, only inside an open window (pickSendLine decides; a closed one sends nothing). */
  private async tellFamily(v: { row: MeetingRow; invitee: StoredInvitee; actorId: string; teacherId: string | null; now: Date }): Promise<boolean> {
    const phone = v.invitee.phone_e164 ?? '';
    const body = cancellationText({ title: v.row.title, when: inviteeWhen(v.row.starts_at, v.invitee) });
    const expiresAt = new Date(v.now.getTime() + HOUR_MS).toISOString();
    const dedupKey = cancelDedupKey(v.row.id, phone);
    const out = await this.deps.sender.chat({ phone, body, dedupKey, actorId: v.actorId, teacherId: v.teacherId, expiresAt, now: v.now });
    return out.status === 'sent';
  }
}
