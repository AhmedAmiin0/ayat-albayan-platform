import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { conflict } from '../../../common/http/errors';
import { dbError } from '../../../common/http/http';

/**
 * A teacher's sign-in username (docs/30 §1): it lives on the teacher's login profile (profiles.username,
 * unique, lower-case), so it needs a linked login first (409 username_needs_login).
 */
@Injectable()
export class TeacherUsernames {
  constructor(@Inject(DB) private readonly db: Db) {}

  async of(profileId: string | null): Promise<string | null> {
    if (!profileId) return null;
    const { data, error } = await this.db.from('profiles').select('username').eq('id', profileId).maybeSingle();
    if (error) throw dbError(error);
    return data?.username ?? null;
  }

  /** null clears it. 409 username_needs_login / username_taken. */
  async set(profileId: string | null, username: string | null): Promise<void> {
    if (!profileId) throw conflict('username_needs_login');
    const { error } = await this.db.from('profiles').update({ username }).eq('id', profileId);
    if (error?.code === '23505') throw conflict('username_taken');
    if (error) throw dbError(error);
  }
}
