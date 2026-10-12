import type { Tables } from '@ab/db';
import { joinWindowConfig, type JoinWindowConfig } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { SettingsService } from '../../common/settings/settings.service';
import { dbError } from '../teachers/http';

export type MeetingRow = Pick<
  Tables<'meetings'>,
  'id' | 'title' | 'created_by' | 'created_at' | 'ends_at' | 'revoked' | 'starts_at' | 'planned_end_at' | 'cancelled_at'
>;
/** Never the hash nor the request id: they are only ever compared in the query. */
export const MEETING_COLUMNS = 'id, title, created_by, created_at, ends_at, revoked, starts_at, planned_end_at, cancelled_at';

export interface NewMeeting {
  title: string;
  createdBy: string;
  hash: string;
  startsAt: string | null;
  plannedEndAt: string | null;
  clientRequestId: string | null;
}

/** Reads and writes of «اجتماع داخلي» (service role; the services guard, migrations 193, 410). */
@Injectable()
export class InternalMeetingsQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: SettingsService,
  ) {}

  /** settings.default_meeting_title: the title of a meeting created without one. */
  async defaultTitle(): Promise<string> {
    return (await this.settings.all()).default_meeting_title;
  }

  /** The lesson join window (settings.join_opens_before_min / join_closes_after_min). */
  async joinWindow(): Promise<JoinWindowConfig> {
    return joinWindowConfig(await this.settings.all());
  }

  /** null on a duplicate client_request_id (the caller reads the first row back). */
  async insert(row: NewMeeting): Promise<MeetingRow | null> {
    const { data, error } = await this.db
      .from('meetings')
      .insert({
        title: row.title,
        created_by: row.createdBy,
        link_token_hash: row.hash,
        starts_at: row.startsAt,
        planned_end_at: row.plannedEndAt,
        client_request_id: row.clientRequestId,
      })
      .select(MEETING_COLUMNS)
      .single();
    if (error?.code === '23505' && row.clientRequestId) return null;
    if (error) throw dbError(error);
    return data;
  }

  /** The meeting a retried POST /meetings already created (rule 8). */
  async byRequest(createdBy: string, clientRequestId: string): Promise<MeetingRow | null> {
    const { data, error } = await this.db
      .from('meetings')
      .select(MEETING_COLUMNS)
      .eq('created_by', createdBy)
      .eq('client_request_id', clientRequestId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async byId(id: string): Promise<MeetingRow | null> {
    const { data, error } = await this.db.from('meetings').select(MEETING_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async byHash(hash: string): Promise<MeetingRow | null> {
    const { data, error } = await this.db.from('meetings').select(MEETING_COLUMNS).eq('link_token_hash', hash).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The meeting behind an invitee's personal link (migration 411; cleared when cancelled). */
  async byInviteHash(hash: string): Promise<MeetingRow | null> {
    const { data, error } = await this.db.from('meeting_invitees').select('meeting_id').eq('token_hash', hash).maybeSingle();
    if (error) throw dbError(error);
    return data ? this.byId(data.meeting_id) : null;
  }

  /** Stamps ends_at once (a second call keeps the first time). */
  async end(id: string, at: string): Promise<MeetingRow | null> {
    const { error } = await this.db.from('meetings').update({ ends_at: at }).eq('id', id).is('ends_at', null);
    if (error) throw dbError(error);
    return this.byId(id);
  }

  /** PATCH /meetings/:id: a new title and/or a new time. */
  async update(id: string, patch: { title?: string; starts_at?: string; planned_end_at?: string }): Promise<void> {
    const { error } = await this.db.from('meetings').update(patch).eq('id', id);
    if (error) throw dbError(error);
  }

  /** Stamps cancelled_at once; false when it already was. */
  async cancel(id: string, at: string): Promise<boolean> {
    const { data, error } = await this.db.from('meetings').update({ cancelled_at: at }).eq('id', id).is('cancelled_at', null).select('id');
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /** The name a staff login shows in the room. */
  async profileName(profileId: string): Promise<string | null> {
    const { data, error } = await this.db.from('profiles').select('full_name').eq('id', profileId).maybeSingle();
    if (error) throw dbError(error);
    return data?.full_name ?? null;
  }

  /** «رابط جديد»: the hash is replaced in place, so the previous link stops working. */
  async rotate(id: string, hash: string): Promise<void> {
    const { error } = await this.db.from('meetings').update({ link_token_hash: hash }).eq('id', id);
    if (error) throw dbError(error);
  }
}
