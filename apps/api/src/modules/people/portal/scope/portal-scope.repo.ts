import type { PortalStudent } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';

/** The portal's one scope read (service role): portal_students_of (migration 790). */
@Injectable()
export class PortalScopeRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * A guardian login's students (guardians.profile_id), or a student login's own row (students.profile_id),
   * by the profile's role in the database. Empty for a disabled or staff profile.
   */
  async studentsOf(profileId: string): Promise<PortalStudent[]> {
    const { data, error } = await this.db.rpc('portal_students_of', { p_profile: profileId });
    if (error) throw pgError(error);
    return data.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      tz: s.tz,
      contact_is_self: s.contact_is_self,
    }));
  }

  /** The ids among these students that are test (students.is_test, docs/56). */
  async testIdsOf(ids: readonly string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const { data, error } = await this.db
      .from('students')
      .select('id')
      .in('id', ids)
      .eq('is_test', true);
    if (error) throw pgError(error);
    return new Set(data.map((s) => s.id));
  }
}
