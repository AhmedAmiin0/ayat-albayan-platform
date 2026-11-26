import type { Database } from '@ab/db';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '@/common/db/db.module';
import { REPLY_COLUMNS, type SavedReplyRow } from './saved-replies.mapper';
import { isUniqueViolation, pgError } from '@/common/db/errors';
import { httpError } from '@/common/http/errors';

export type ReplyInsert = Database['public']['Tables']['saved_replies']['Insert'];
export type ReplyPatch = Database['public']['Tables']['saved_replies']['Update'];

function check(error: PostgrestError | null): void {
  if (error) throw pgError(error);
}

/** One Storage object belongs to one reply (migration 672): a second row on the same path is a bad path. */
function checkWrite(error: PostgrestError | null): void {
  if (isUniqueViolation(error)) throw httpError(HttpStatus.BAD_REQUEST, 'file_path');
  check(error);
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
    check(error);
    return data ?? [];
  }

  async one(id: string): Promise<SavedReplyRow | null> {
    const { data, error } = await this.db.from('saved_replies').select(REPLY_COLUMNS).eq('id', id).maybeSingle();
    check(error);
    return data;
  }

  /** One list: the shared one (owner null) or one person's. */
  async listOf(owner: string | null): Promise<SavedReplyRow[]> {
    const base = this.db.from('saved_replies').select(REPLY_COLUMNS);
    const { data, error } = await (owner === null ? base.is('owner_profile_id', null) : base.eq('owner_profile_id', owner));
    check(error);
    return data ?? [];
  }

  async insert(row: ReplyInsert): Promise<SavedReplyRow> {
    const { data, error } = await this.db.from('saved_replies').insert(row).select(REPLY_COLUMNS).single();
    checkWrite(error);
    if (!data) throw new Error('saved reply create returned no row');
    return data;
  }

  /** null = the reply was deleted meanwhile. */
  async update(id: string, patch: ReplyPatch): Promise<SavedReplyRow | null> {
    const { data, error } = await this.db.from('saved_replies').update(patch).eq('id', id).select(REPLY_COLUMNS).maybeSingle();
    checkWrite(error);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('saved_replies').delete().eq('id', id);
    check(error);
  }

  /** Reorder: each row's new position, one small update each (a list holds a few dozen replies). */
  async setPositions(rows: readonly { id: string; position: number }[], by: string): Promise<void> {
    for (const r of rows) {
      const { error } = await this.db.from('saved_replies').update({ position: r.position, updated_by: by }).eq('id', r.id);
      check(error);
    }
  }
}
