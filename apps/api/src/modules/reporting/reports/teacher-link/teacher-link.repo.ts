import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/** The one read the link adds (service role): the teacher's auth user, for the audit actor. */
@Injectable()
export class TeacherLinkRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** teachers.profile_id; null when the teacher has no platform account (or no row). */
  async profileOf(teacherId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('teachers')
      .select('profile_id')
      .eq('id', teacherId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data?.profile_id ?? null;
  }
}
