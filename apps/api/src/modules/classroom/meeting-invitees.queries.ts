import type { TablesInsert, TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import type { InviteeRow } from './meeting-invites.mapper';

/** The server's view of an invitee: the phone and profile too (never sent to a client), never the hash. */
export interface StoredInvitee extends InviteeRow {
  meeting_id: string;
  profile_id: string | null;
  student_id: string | null;
  phone_e164: string | null;
  tz: string;
}

const COLUMNS = 'id, meeting_id, kind, profile_id, student_id, phone_e164, display_name, tz, channel, status, error_code, sent_at';
/** Every meeting invitation's WhatsApp row carries this dedup prefix (the daily limit counts them). */
export const INVITE_DEDUP_PREFIX = 'meeting_invite:';

/** public.meeting_invitees (migration 411; service role, the services guard). */
@Injectable()
export class MeetingInviteesQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async forMeeting(meetingId: string): Promise<StoredInvitee[]> {
    const { data, error } = await this.db.from('meeting_invitees').select(COLUMNS).eq('meeting_id', meetingId).order('created_at');
    if (error) throw dbError(error);
    return data;
  }

  async byId(meetingId: string, id: string): Promise<StoredInvitee | null> {
    const { data, error } = await this.db.from('meeting_invitees').select(COLUMNS).eq('meeting_id', meetingId).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Inserts the new rows (the caller already dropped duplicates against forMeeting). */
  async insert(rows: TablesInsert<'meeting_invitees'>[]): Promise<StoredInvitee[]> {
    if (rows.length === 0) return [];
    const { data, error } = await this.db.from('meeting_invitees').insert(rows).select(COLUMNS);
    if (error) throw dbError(error);
    return data;
  }

  async update(id: string, patch: TablesUpdate<'meeting_invitees'>): Promise<void> {
    const { error } = await this.db.from('meeting_invitees').update(patch).eq('id', id);
    if (error) throw dbError(error);
  }

  /** Cancelling the meeting: every personal guest link stops working at once. */
  async clearTokens(meetingId: string): Promise<void> {
    const { error } = await this.db.from('meeting_invitees').update({ token_hash: null }).eq('meeting_id', meetingId);
    if (error) throw dbError(error);
  }

  /** WhatsApp invitation rows the login queued since `since` (resends included): the daily limit. */
  async whatsappSince(createdBy: string, since: string): Promise<number> {
    const { count, error } = await this.db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', createdBy)
      .like('dedup_key', `${INVITE_DEDUP_PREFIX}%`)
      .gte('created_at', since);
    if (error) throw dbError(error);
    return count ?? 0;
  }

  /** True when a WhatsApp row with this dedup key was already queued (a retried resend). */
  async queued(dedupKey: string): Promise<boolean> {
    const { data, error } = await this.db.from('messages').select('id').eq('dedup_key', dedupKey).maybeSingle();
    if (error) throw dbError(error);
    return data !== null;
  }
}
