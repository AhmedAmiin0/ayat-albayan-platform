import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { ownershipOf } from '@/modules/sales/sales';

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
    const { data, error } = await this.db.from('students').select('id, name, code').in('id', [...ids]);
    if (error) throw dbError(error);
    return data.map((s) => ({ id: s.id, name: s.name, code: s.code ?? '' }));
  }

  /** Display name per sender profile: the teacher's display name, else the student's or guardian's name. */
  async names(profileIds: readonly string[]): Promise<Map<string, string>> {
    const ids = [...new Set(profileIds)];
    const names = new Map<string, string>();
    if (ids.length === 0) return names;
    const [teachers, students, guardians] = await Promise.all([
      this.db.from('teachers').select('profile_id, display_name_ar').in('profile_id', ids),
      this.db.from('students').select('profile_id, name').in('profile_id', ids),
      this.db.from('guardians').select('profile_id, name').in('profile_id', ids),
    ]);
    // Later sources win: a teacher's display name over a student's or guardian's name.
    for (const r of [guardians, students, teachers]) {
      if (r.error) throw dbError(r.error);
      for (const row of r.data) if (row.profile_id) names.set(row.profile_id, 'display_name_ar' in row ? row.display_name_ar : row.name);
    }
    return names;
  }

  /** The students an assistant owns (sales ownership: her leads' families, the students she brought). */
  async ownedStudentIds(profileId: string): Promise<string[]> {
    return (await ownershipOf(this.db, profileId)).studentIds;
  }

  /** The profiles of these teachers (a teacher without a login gets no push). */
  async teacherProfiles(teacherIds: readonly string[]): Promise<string[]> {
    if (teacherIds.length === 0) return [];
    const { data, error } = await this.db.from('teachers').select('profile_id').in('id', [...teacherIds]);
    if (error) throw dbError(error);
    return data.flatMap((t) => (t.profile_id ? [t.profile_id] : []));
  }
}
