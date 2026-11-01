import type { Database } from '@ab/db';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '@/common/db/db.module';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { REPLY_COLUMNS, type SavedReplyRow } from './saved-replies.mapper';

export type ReplyInsert = Database['public']['Tables']['saved_replies']['Insert'];
export type ReplyPatch = Database['public']['Tables']['saved_replies']['Update'];

function check(error: PostgrestError | null, what: string): void {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

/** One Storage object belongs to one reply (migration 672): a second row on the same path is a bad path. */
function checkWrite(error: PostgrestError | null, what: string): void {
  if (error?.code === '23505') throw waHttpError('file_path', HttpStatus.BAD_REQUEST);
  check(error, what);
}

/** saved_replies (migration 20261025000670) through the service role; the service decides who may. */
@Injectable()
export class SavedRepliesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The shared list (owner null) and this person's own; unordered (inListOrder sorts). */
  async visibleTo(profileId: string): Promise<SavedReplyRow[]> {
    const { data, error } = await this.db
      .from('saved_replies')
      .select(REPLY_COLUMNS)
      .or(`owner_profile_id.is.null,owner_profile_id.eq.${profileId}`);
    check(error, 'saved replies read');
    return data ?? [];
  }

  async one(id: string): Promise<SavedReplyRow | null> {
    const { data, error } = await this.db.from('saved_replies').select(REPLY_COLUMNS).eq('id', id).maybeSingle();
    check(error, 'saved reply read');
    return data;
  }

  /** One list: the shared one (owner null) or one person's. */
  async listOf(owner: string | null): Promise<SavedReplyRow[]> {
    const base = this.db.from('saved_replies').select(REPLY_COLUMNS);
    const { data, error } = await (owner === null ? base.is('owner_profile_id', null) : base.eq('owner_profile_id', owner));
    check(error, 'saved replies list read');
    return data ?? [];
  }

  async insert(row: ReplyInsert): Promise<SavedReplyRow> {
    const { data, error } = await this.db.from('saved_replies').insert(row).select(REPLY_COLUMNS).single();
    checkWrite(error, 'saved reply create');
    if (!data) throw new Error('saved reply create returned no row');
    return data;
  }

  /** null = the reply was deleted meanwhile. */
  async update(id: string, patch: ReplyPatch): Promise<SavedReplyRow | null> {
    const { data, error } = await this.db.from('saved_replies').update(patch).eq('id', id).select(REPLY_COLUMNS).maybeSingle();
    checkWrite(error, 'saved reply update');
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('saved_replies').delete().eq('id', id);
    check(error, 'saved reply delete');
  }

  /** Reorder: each row's new position, one small update each (a list holds a few dozen replies). */
  async setPositions(rows: readonly { id: string; position: number }[], by: string): Promise<void> {
    for (const r of rows) {
      const { error } = await this.db.from('saved_replies').update({ position: r.position, updated_by: by }).eq('id', r.id);
      check(error, 'saved reply move');
    }
  }
}
