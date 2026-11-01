import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { guardedError, phoneAware } from '@/modules/people/users/users.errors';
import type { NewProfile, ProfilePatch, StaffProfile } from './users.store';

const STAFF = 'id, full_name, role, role_id, disabled_at';
const STAFF_ROLES = ['admin', 'teacher', 'assistant', 'sales'] as const;

type Disable = { by: string; reason: string | null } | null;

/** The disabled_* columns a disable stamps and an enable clears. */
const disabledPatch = (value: Disable) =>
  value
    ? {
        disabled_at: new Date().toISOString(),
        disabled_by: value.by,
        disabled_reason: value.reason,
      }
    : { disabled_at: null, disabled_by: null, disabled_reason: null };

/**
 * The profile half of UserStore: the staff rows the safety rules read, and the guarded profile
 * writes (409 phone_taken, 409 last_admin from migration 287).
 */
@Injectable()
export class UserProfilesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async staff(): Promise<StaffProfile[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select(STAFF)
      .in('role', [...STAFF_ROLES]);
    if (error) throw dbError(error);
    return data;
  }

  async profile(id: string): Promise<StaffProfile | null> {
    const { data, error } = await this.db.from('profiles').select(STAFF).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async upsertProfile(row: NewProfile): Promise<void> {
    const { error } = await this.db.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) throw phoneAware(error);
  }

  async updateProfile(id: string, patch: ProfilePatch): Promise<void> {
    const { error } = await this.db.from('profiles').update(patch).eq('id', id);
    if (error) throw guardedError(error);
  }

  async setDisabled(id: string, value: Disable): Promise<void> {
    const { error } = await this.db.from('profiles').update(disabledPatch(value)).eq('id', id);
    if (error) throw guardedError(error);
  }

  async forgetBrowsers(id: string): Promise<void> {
    const { error } = await this.db.from('web_push_subscriptions').delete().eq('profile_id', id);
    if (error) throw guardedError(error);
  }
}
