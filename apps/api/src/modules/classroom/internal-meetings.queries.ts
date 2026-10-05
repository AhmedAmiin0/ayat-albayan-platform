import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { SettingsService } from '../../common/settings/settings.service';
import { dbError } from '../teachers/http';

export type MeetingRow = Pick<Tables<'meetings'>, 'id' | 'title' | 'created_by' | 'created_at' | 'ends_at' | 'revoked'>;
/** Never the hash: it is only ever compared in the query. */
const COLUMNS = 'id, title, created_by, created_at, ends_at, revoked';
const LIST_LIMIT = 20;

/** Reads and writes of «اجتماع داخلي» (service role; the services guard, migration 193). */
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

  async insert(row: { title: string; createdBy: string; hash: string }): Promise<MeetingRow> {
    const { data, error } = await this.db
      .from('meetings')
      .insert({ title: row.title, created_by: row.createdBy, link_token_hash: row.hash })
      .select(COLUMNS)
      .single();
    if (error) throw dbError(error);
    return data;
  }

  async byId(id: string): Promise<MeetingRow | null> {
    const { data, error } = await this.db.from('meetings').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async byHash(hash: string): Promise<MeetingRow | null> {
    const { data, error } = await this.db.from('meetings').select(COLUMNS).eq('link_token_hash', hash).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The newest 20: everyone's for an admin (`createdBy` null), else the caller's own. */
  async latest(createdBy: string | null): Promise<MeetingRow[]> {
    let q = this.db.from('meetings').select(COLUMNS);
    if (createdBy !== null) q = q.eq('created_by', createdBy);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(LIST_LIMIT);
    if (error) throw dbError(error);
    return data;
  }

  /** Stamps ends_at once (a second call keeps the first time). */
  async end(id: string, at: string): Promise<MeetingRow | null> {
    const { error } = await this.db.from('meetings').update({ ends_at: at }).eq('id', id).is('ends_at', null);
    if (error) throw dbError(error);
    return this.byId(id);
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
