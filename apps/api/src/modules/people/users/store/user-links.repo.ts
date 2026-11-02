import type { LinkKind } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { phoneAware } from '@/modules/people/users/users.errors';
import * as links from './users.links.repo';
import type { NewTeacher } from './users.store';

interface TeacherPatch {
  display_name_ar?: string;
  phone_e164?: string | null;
}

/**
 * The linking half of UserStore: the teacher / student / guardian records a login links to
 * (users.links.repo.ts holds the per-table reads), the phone owner check and a new teacher record.
 */
@Injectable()
export class UserLinksRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  phoneTaken(phone: string, exceptProfile: string) {
    return links.phoneTaken(this.db, { phone, except: exceptProfile });
  }

  linkTarget(kind: LinkKind, id: string) {
    return links.linkTarget(this.db, kind, id);
  }

  link(kind: LinkKind, id: string, profileId: string) {
    return links.link(this.db, { kind, id, profileId });
  }

  candidates(kind: LinkKind, q: string | undefined) {
    return links.candidates(this.db, kind, q);
  }

  syncTeacher(profileId: string, patch: TeacherPatch) {
    return links.syncTeacher(this.db, { profileId, patch });
  }

  async createTeacher(row: NewTeacher): Promise<string> {
    const { data, error } = await this.db
      .from('teachers')
      .insert({ ...row, status: 'active' })
      .select('id')
      .single();
    if (error) throw phoneAware(error);
    return data.id;
  }
}
