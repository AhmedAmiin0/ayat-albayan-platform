import type { Database, Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { done, pgError } from '@/common/db/errors';

export type LinkUserRow = Tables<'short_link_users'>;
export type LinkVisitRow = Tables<'short_link_visits'>;
type VisitArgs = Database['public']['Functions']['short_link_record_visit']['Args'];

/** How many listed users and distinct visitors each link has (the list's counts). */
interface LinkCounts {
  users: Map<string, number>;
  visitors: Map<string, number>;
}

const tally = (rows: { code: string }[]): Map<string, number> =>
  rows.reduce((m, r) => m.set(r.code, (m.get(r.code) ?? 0) + 1), new Map<string, number>());

/**
 * public.short_link_users (the many-to-many link ↔ user list) and short_link_visits (one row per
 * distinct visitor): service role only. Their rows go with the link (on delete cascade).
 */
@Injectable()
export class LinkUsersRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async users(code: string): Promise<LinkUserRow[]> {
    const { data, error } = await this.db
      .from('short_link_users')
      .select('*')
      .eq('code', code)
      .order('created_at');
    if (error) throw pgError(error);
    return data;
  }

  /** Adds the rows not listed yet (unique per link and profile / phone): idempotent. */
  async add(rows: TablesInsert<'short_link_users'>[]): Promise<void> {
    if (rows.length === 0) return;
    done(await this.db.from('short_link_users').insert(rows));
  }

  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    done(await this.db.from('short_link_users').delete().in('id', ids));
  }

  async mark(id: string, patch: TablesUpdate<'short_link_users'>): Promise<void> {
    done(await this.db.from('short_link_users').update(patch).eq('id', id));
  }

  async visits(code: string): Promise<LinkVisitRow[]> {
    const { data, error } = await this.db
      .from('short_link_visits')
      .select('*')
      .eq('code', code)
      .order('last_at', { ascending: false });
    if (error) throw pgError(error);
    return data;
  }

  /** short_link_record_visit: 'recorded' | 'limit_reached' | 'gone' (atomic per link). */
  async recordVisit(code: string, key: Omit<VisitArgs, 'p_code'>): Promise<string> {
    const { data, error } = await this.db.rpc('short_link_record_visit', { p_code: code, ...key });
    if (error) throw pgError(error);
    return data;
  }

  async counts(codes: string[]): Promise<LinkCounts> {
    if (codes.length === 0) return { users: new Map(), visitors: new Map() };
    const [users, visits] = await Promise.all([
      this.db.from('short_link_users').select('code').in('code', codes),
      this.db.from('short_link_visits').select('code').in('code', codes),
    ]);
    if (users.error) throw pgError(users.error);
    if (visits.error) throw pgError(visits.error);
    return { users: tally(users.data), visitors: tally(visits.data) };
  }
}
