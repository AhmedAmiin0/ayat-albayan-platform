import { updateMeetingSchema } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { ar } from '../../common/i18n/server-text';
import { parseOrThrow } from '../teachers/http';
import { InternalMeetingsQueries, type MeetingRow } from './internal-meetings.queries';
import { InternalMeetingsService } from './internal-meetings.service';
import type { InvitePolicy } from './meeting-invite.policy';
import { MeetingInviteSender } from './meeting-invite.sender';
import { cancelDedupKey, cancellationText, inviteeWhen, inviteSubject } from './meeting-invite.text';
import { MeetingInviteeResolver } from './meeting-invitee.resolver';
import { MeetingInviteesQueries, type StoredInvitee } from './meeting-invitees.queries';
import { rescheduleTimes } from './meeting-schedule.rules';

const HOUR_MS = 3_600_000;
/** A family the cancellation may reach: its invitation went out, or found the window closed. */
const TOLD = new Set(['sent', 'window_closed']);

/** The invitation side of scheduling (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class MeetingScheduleDeps {
  constructor(
    readonly invitees: MeetingInviteesQueries,
    readonly sender: MeetingInviteSender,
    readonly resolver: MeetingInviteeResolver,
  ) {}
}

/** Same instant? '+00:00' (PostgREST) and '.000Z' (the API) spell one time two ways. */
export const sameInstant = (a: string | null, b: string | null): boolean => a !== null && b !== null && Date.parse(a) === Date.parse(b);

/**
 * PATCH /meetings/:id and POST /meetings/:id/cancel (R-MEET-01), the creator or an admin only (403).
 * A real move (another instant) drops the invitation texts still queued and re-notifies the invited
 * staff (a bell row with its own subject per move, so A→B→A still rings); a family gets the new time
 * with «أعد الإرسال». A duration-only change or a re-save rings nothing. Cancelling stamps cancelled_at
 * (nobody joins after it), closes the room, clears every personal link, drops queued invitation
 * texts, notifies the staff, and sends a family a chat message only when the caller may chat
 * (InvitePolicy) and its window is open (never a template). Cancelling twice is a no-op. 410 once ended.
 */
@Injectable()
export class MeetingScheduleService {
  constructor(
    private readonly meetings: InternalMeetingsService,
    private readonly queries: InternalMeetingsQueries,
    private readonly deps: MeetingScheduleDeps,
  ) {}

  async update(input: { user: AuthUser; id: string; body: unknown }, now = new Date()): Promise<void> {
    const patch = parseOrThrow(updateMeetingSchema, input.body);
    const { row } = await this.meetings.managedOpen(input, now);
    const times = rescheduleTimes(row, patch, now);
    const title = patch.title ?? row.title;
    await this.queries.update(row.id, {
      title,
      ...(times?.startsAt && times.plannedEndAt ? { starts_at: times.startsAt, planned_end_at: times.plannedEndAt } : {}),
    });
    if (!times?.startsAt || sameInstant(times.startsAt, row.starts_at)) return;
    await this.deps.invitees.dropQueuedInvites(row.id);
    const meeting = { id: row.id, title, starts_at: times.startsAt };
    const subject = `${inviteSubject(row.id, times.startsAt)}:moved:${now.toISOString()}`;
    const pushTitle = ar.meetingInvites.push.rescheduled;
    for (const invitee of await this.staff(row.id)) {
      await this.deps.sender.staff({ meeting, invitee, subject, title: pushTitle });
    }
  }

  async cancel(input: { user: AuthUser; id: string }, now = new Date()): Promise<void> {
    const row = await this.meetings.managed(input);
    if (row.cancelled_at || !(await this.queries.cancel(row.id, now.toISOString()))) return;
    this.meetings.closeRoom(row.id, now);
    await this.deps.invitees.clearTokens(row.id);
    await this.deps.invitees.dropQueuedInvites(row.id);
    const policy = await this.deps.resolver.policy(input.user);
    const all = await this.deps.invitees.forMeeting(row.id);
    const title = ar.meetingInvites.push.cancelled;
    let queued = false;
    for (const invitee of all.filter((i) => i.status !== 'cancelled')) {
      if (invitee.kind === 'staff') await this.deps.sender.staff({ meeting: row, invitee, subject: `cancel:${row.id}`, title });
      else if (TOLD.has(invitee.status) && invitee.phone_e164 && policy.mayChat(invitee.phone_e164)) {
        queued = (await this.tellFamily({ row, invitee, actorId: input.user.id, now })) || queued;
      }
    }
    if (queued) this.deps.sender.kick();
  }

  private async staff(meetingId: string): Promise<StoredInvitee[]> {
    return (await this.deps.invitees.forMeeting(meetingId)).filter((i) => i.kind === 'staff' && i.status !== 'cancelled');
  }

  /** The cancellation chat text, only inside an open window (pickSendLine decides; a closed one sends nothing). */
  private async tellFamily(v: { row: MeetingRow; invitee: StoredInvitee; actorId: string; now: Date }): Promise<boolean> {
    const phone = v.invitee.phone_e164 ?? '';
    const body = cancellationText({ title: v.row.title, when: inviteeWhen(v.row.starts_at, v.invitee) });
    const expiresAt = new Date(v.now.getTime() + HOUR_MS).toISOString();
    const out = await this.deps.sender.chat({ phone, body, dedupKey: cancelDedupKey(v.row.id, phone), actorId: v.actorId, expiresAt, now: v.now });
    return out.status === 'sent';
  }
}
