import { updateMeetingSchema } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { ar } from '../../common/i18n/server-text';
import { parseOrThrow } from '../teachers/http';
import { InternalMeetingsQueries, type MeetingRow } from './internal-meetings.queries';
import { InternalMeetingsService } from './internal-meetings.service';
import { MeetingInviteSender } from './meeting-invite.sender';
import { cancelDedupKey, cancellationText, inviteSubject, whenText } from './meeting-invite.text';
import { MeetingInviteesQueries, type StoredInvitee } from './meeting-invitees.queries';
import { rescheduleTimes } from './meeting-schedule.rules';

const HOUR_MS = 3_600_000;

/** The invitation side of scheduling (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class MeetingScheduleDeps {
  constructor(
    readonly invitees: MeetingInviteesQueries,
    readonly sender: MeetingInviteSender,
  ) {}
}

/**
 * PATCH /meetings/:id and POST /meetings/:id/cancel (R-MEET-01), the creator or an admin only (403).
 * A new time re-notifies the invited staff (a new bell row: the subject carries starts_at); a family
 * gets the new time with «أعد الإرسال» (a fresh personal link). Cancelling stamps cancelled_at (nobody
 * joins after it), clears every personal guest link, notifies the staff, and sends a family a chat
 * message only while its window is open (never a template). Cancelling twice is a no-op. 410 once ended.
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
    if (!times?.startsAt || times.startsAt === row.starts_at) return;
    const meeting = { id: row.id, title, starts_at: times.startsAt };
    const pushTitle = ar.meetingInvites.push.rescheduled;
    for (const invitee of await this.staff(row.id)) {
      await this.deps.sender.staff({ meeting, invitee, subject: inviteSubject(row.id, times.startsAt), title: pushTitle });
    }
  }

  async cancel(input: { user: AuthUser; id: string }, now = new Date()): Promise<void> {
    const row = await this.meetings.managed(input);
    if (row.cancelled_at || !(await this.queries.cancel(row.id, now.toISOString()))) return;
    await this.deps.invitees.clearTokens(row.id);
    const all = await this.deps.invitees.forMeeting(row.id);
    const title = ar.meetingInvites.push.cancelled;
    let queued = false;
    for (const invitee of all.filter((i) => i.status !== 'cancelled')) {
      if (invitee.kind === 'staff') await this.deps.sender.staff({ meeting: row, invitee, subject: `cancel:${row.id}`, title });
      else if (invitee.status === 'sent' && invitee.phone_e164) queued = (await this.tellFamily({ row, invitee, actorId: input.user.id, now })) || queued;
    }
    if (queued) this.deps.sender.kick();
  }

  private async staff(meetingId: string): Promise<StoredInvitee[]> {
    return (await this.deps.invitees.forMeeting(meetingId)).filter((i) => i.kind === 'staff' && i.status !== 'cancelled');
  }

  /** The cancellation chat text, only inside an open window (a closed one sends nothing). */
  private async tellFamily(v: { row: MeetingRow; invitee: StoredInvitee; actorId: string; now: Date }): Promise<boolean> {
    const phone = v.invitee.phone_e164 ?? '';
    const body = cancellationText({ title: v.row.title, when: whenText(v.row.starts_at, v.invitee.tz) });
    const expiresAt = new Date(v.now.getTime() + HOUR_MS).toISOString();
    const out = await this.deps.sender.chat({ phone, body, dedupKey: cancelDedupKey(v.row.id, phone), actorId: v.actorId, expiresAt, now: v.now });
    return out.status === 'sent';
  }
}
