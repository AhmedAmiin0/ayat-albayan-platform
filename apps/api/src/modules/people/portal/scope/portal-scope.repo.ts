import type { PortalStudent } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

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
    if (error) throw dbError(error);
    return data.map((s) => ({ id: s.id, code: s.code, name: s.name, tz: s.tz, contact_is_self: s.contact_is_self }));
  }
}
