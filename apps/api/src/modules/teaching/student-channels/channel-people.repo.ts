import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { maybe, pgError, rows } from '@/common/db/errors';

export interface ChannelStudent {
  id: string;
  name: string;
  code: string;
}

/** The names a thread shows and the profiles a push goes to: names only, never a phone or email. */
@Injectable()
export class ChannelPeopleRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async students(ids: readonly string[]): Promise<ChannelStudent[]> {
    if (ids.length === 0) return [];
    const data = rows(await this.db.from('students').select('id, name, code').in('id', [...ids]));
    return data.map((s) => ({ id: s.id, name: s.name, code: s.code ?? '' }));
  }

  /**
   * Display name per sender profile: the teacher's display name, else the student's or guardian's
   * name, else the assistant's profile name (she writes too).
   */
  async names(profileIds: readonly string[]): Promise<Map<string, string>> {
    const ids = [...new Set(profileIds)];
    if (ids.length === 0) return new Map<string, string>();
    const [sales, teachers, students, guardians] = await Promise.all([
      this.salesNames(ids),
      this.db.from('teachers').select('profile_id, display_name_ar').in('profile_id', ids),
      this.db.from('students').select('profile_id, name').in('profile_id', ids),
      this.db.from('guardians').select('profile_id, name').in('profile_id', ids),
    ]);
    // Later sources win: a teacher's display name over a student's or guardian's name, over an
    // assistant's.
    const names = new Map<string, string>(sales);
    for (const r of [guardians, students, teachers]) {
      if (r.error) throw pgError(r.error);
      for (const row of r.data) if (row.profile_id) names.set(row.profile_id, 'display_name_ar' in row ? row.display_name_ar : row.name);
    }
    return names;
  }

  /** The salespeople among these profiles, by their profile name (never a phone or email). */
  private async salesNames(ids: readonly string[]): Promise<[string, string][]> {
    const data = rows(await this.db
      .from('profiles')
      .select('id, full_name')
      .in('id', [...ids])
      .eq('role', 'sales'));
    return data.map((p): [string, string] => [p.id, p.full_name]);
  }

  /**
   * The chat's one assistant: the seat holder
   * (student_channels.assistant_id) while she is still a salesperson; null when free.
   */
  async assistantId(studentId: string): Promise<string | null> {
    const data = maybe(await this.db
      .from('student_channels')
      .select('assistant_id')
      .eq('student_id', studentId)
      .maybeSingle());
    const id = data?.assistant_id;
    if (!id) return null;
    return (await this.salesNames([id])).length > 0 ? id : null;
  }
}
