import type { MeetingInviteChannel, MeetingInviteStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../../common/db/db.module';
import { dbError } from '../../../../../common/http/http';
import { MEETING_COLUMNS, type MeetingRow } from '../../internal-meetings/internal-meetings.queries';

const LIST_LIMIT = 20;

export interface MyInviteRow {
  meeting_id: string;
  status: MeetingInviteStatus;
  channel: MeetingInviteChannel;
}

/**
 * GET /meetings (R-MEET-01): the newest the caller created (an admin: everyone's), the coming
 * scheduled ones, and the ones the caller is invited to (migration 411). Service role.
 */
@Injectable()
export class MeetingListQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The newest 20: everyone's for an admin (`createdBy` null), else the caller's own. */
  async latest(createdBy: string | null): Promise<MeetingRow[]> {
    let q = this.db.from('meetings').select(MEETING_COLUMNS);
    if (createdBy !== null) q = q.eq('created_by', createdBy);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(LIST_LIMIT);
    if (error) throw dbError(error);
    return data;
  }

  /** Scheduled meetings whose planned end is after `since`, soonest first (created ones, or all for an admin). */
  async upcoming(input: { createdBy: string | null; since: string }): Promise<MeetingRow[]> {
    let q = this.db.from('meetings').select(MEETING_COLUMNS).gt('planned_end_at', input.since).is('cancelled_at', null);
    if (input.createdBy !== null) q = q.eq('created_by', input.createdBy);
    const { data, error } = await q.order('starts_at', { ascending: true }).limit(LIST_LIMIT);
    if (error) throw dbError(error);
    return data;
  }

  /** The caller's own invitations (newest first), never a cancelled one. */
  async myInvites(profileId: string): Promise<MyInviteRow[]> {
    const { data, error } = await this.db
      .from('meeting_invitees')
      .select('meeting_id, status, channel')
      .eq('profile_id', profileId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT);
    if (error) throw dbError(error);
    return data.map((r) => ({ meeting_id: r.meeting_id, status: r.status as MeetingInviteStatus, channel: r.channel as MeetingInviteChannel }));
  }

  async byIds(ids: readonly string[]): Promise<MeetingRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('meetings').select(MEETING_COLUMNS).in('id', [...ids]);
    if (error) throw dbError(error);
    return data;
  }

  /** Invitees per meeting (cancelled rows not counted). */
  async counts(ids: readonly string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (ids.length === 0) return counts;
    const { data, error } = await this.db.from('meeting_invitees').select('meeting_id').in('meeting_id', [...ids]).neq('status', 'cancelled');
    if (error) throw dbError(error);
    for (const r of data) counts.set(r.meeting_id, (counts.get(r.meeting_id) ?? 0) + 1);
    return counts;
  }
}
