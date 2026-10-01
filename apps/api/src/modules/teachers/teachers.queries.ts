import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError, type Page, type PageQuery } from './http';

export type Teacher = Tables<'teachers'>;

/** All supabase access for `teachers` (service role — callers enforce roles). R-TCH-01. */
@Injectable()
export class TeachersQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list({ page, pageSize }: PageQuery): Promise<Page<Teacher>> {
    const from = (page - 1) * pageSize;
    const { data, count, error } = await this.db
      .from('teachers')
      .select('*', { count: 'exact' })
      .order('display_name_ar')
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw dbError(error);
    return { items: data, total: count ?? 0, page, pageSize };
  }

  async get(id: string): Promise<Teacher | null> {
    const { data, error } = await this.db.from('teachers').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async insert(row: TablesInsert<'teachers'>): Promise<Teacher> {
    const { data, error } = await this.db.from('teachers').insert(row).select('*').single();
    if (error) throw dbError(error);
    return data;
  }

  async update(id: string, patch: TablesUpdate<'teachers'>): Promise<Teacher | null> {
    const { data, error } = await this.db
      .from('teachers')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** false when no row matched. Fails with 409 while students still reference the teacher. */
  async remove(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('teachers').delete().eq('id', id).select('id');
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /** teachers.id of the signed-in user (JWT sub = profiles.id = teachers.profile_id). */
  async idByProfile(profileId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data?.id ?? null;
  }
}
