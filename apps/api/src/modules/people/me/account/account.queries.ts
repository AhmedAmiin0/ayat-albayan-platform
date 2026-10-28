import type { UserRole } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';
import { phoneAware } from '../../users/users.errors';
import { phoneTaken } from '../../users/store/users.links.queries';
import { selfWritable, type AccountRow, type AccountStore, type SelfPatch } from './account.ports';

interface RoleName {
  key: string;
  name_ar: string;
  name_en: string | null;
}

/** AccountStore on the service-role client: the caller's own profile row, whitelisted writes only. */
@Injectable()
export class AccountQueries implements AccountStore {
  constructor(@Inject(DB) private readonly db: Db) {}

  async get(id: string): Promise<AccountRow | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, full_name, phone_e164, avatar_path, role, role_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    const [name, teacher_id] = await Promise.all([this.roleName(data.role, data.role_id), this.teacherId(id)]);
    const role = { base: data.role, key: name?.key ?? null, name_ar: name?.name_ar ?? null, name_en: name?.name_en ?? null };
    return { id: data.id, full_name: data.full_name, phone_e164: data.phone_e164, avatar_path: data.avatar_path, role, teacher_id };
  }

  private async teacherId(profileId: string): Promise<string | null> {
    const { data, error } = await this.db.from('teachers').select('id').eq('profile_id', profileId).maybeSingle();
    if (error) throw dbError(error);
    return data?.id ?? null;
  }

  async update(id: string, patch: SelfPatch): Promise<void> {
    const { error } = await this.db.from('profiles').update(selfWritable(patch)).eq('id', id);
    if (error) throw phoneAware(error);
  }

  phoneTaken(phone: string, exceptId: string): Promise<boolean> {
    return phoneTaken(this.db, { phone, except: exceptId });
  }

  /** The held custom role's names, else the base role's system role. */
  private async roleName(base: UserRole, roleId: string | null): Promise<RoleName | null> {
    const query = this.db.from('roles').select('key, name_ar, name_en');
    const { data, error } = await (roleId ? query.eq('id', roleId) : query.eq('is_system', true).eq('base_role', base)).limit(1);
    if (error) throw dbError(error);
    return data[0] ?? null;
  }
}
