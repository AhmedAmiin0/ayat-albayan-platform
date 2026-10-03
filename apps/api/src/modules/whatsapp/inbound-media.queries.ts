import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';

/** The columns of an inbound message that carry a file (R-MSG-06). */
export type MediaMessage = {
  id: string;
  phone_e164: string;
  direction: 'inbound' | 'outbound';
  media_id: string | null;
  media_mime: string | null;
  media_path: string | null;
  /** The file's caption. */
  body: string | null;
  created_at: string;
};
const COLUMNS = 'id, phone_e164, direction, media_id, media_mime, media_path, body, created_at';

/** DB touches of InboundMedia and of the chat's file picker (service role; the callers are admin-only). */
@Injectable()
export class InboundMediaQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async message(id: string): Promise<MediaMessage | null> {
    const { data, error } = await this.db.from('messages').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw new Error(`message read failed: ${error.message}`);
    return data;
  }

  /** Inbound files of one phone since `since`, newest first (the caller filters by mime). */
  async recent(input: { phone: string; since: string; limit: number }): Promise<MediaMessage[]> {
    const { data, error } = await this.db
      .from('messages')
      .select(COLUMNS)
      .eq('phone_e164', input.phone)
      .eq('direction', 'inbound')
      .not('media_id', 'is', null)
      .gte('created_at', input.since)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (error) throw new Error(`thread media read failed: ${error.message}`);
    return data;
  }

  /** Only where it is still empty: two admins opening the same file keep the first path. */
  async setPath(id: string, path: string): Promise<void> {
    const { error } = await this.db.from('messages').update({ media_path: path }).eq('id', id).is('media_path', null);
    if (error) throw new Error(`message media_path update failed: ${error.message}`);
  }
}
