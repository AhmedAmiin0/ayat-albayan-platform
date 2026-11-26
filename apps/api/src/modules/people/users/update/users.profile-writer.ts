import type { UserUpdate } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import {
  AUTH_ADMIN,
  USER_STORE,
  type AuthAdmin,
  type ProfilePatch,
  type UserStore,
} from '@/modules/people/users/store/users.store';
import { UserRecordLinker } from '@/modules/people/users/lifecycle/users.record-linker';
import type { RecordLink } from '@/modules/people/users/lifecycle/users.record-linker.types';

interface TeacherSync {
  display_name_ar?: string;
  phone_e164?: string | null;
}

interface ProfileChange {
  patch: ProfilePatch;
  input: UserUpdate;
  record?: RecordLink | undefined;
}

const hasKeys = (o: object): boolean => Object.keys(o).length > 0;

/**
 * The profile side of PATCH /users/:id: the email and phone owners are checked before anything is
 * written, then the profile and its linked teacher; the auth email changes last.
 */
@Injectable()
export class UserProfileWriter {
  private readonly records: UserRecordLinker;

  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    @Inject(AUTH_ADMIN) private readonly auth: AuthAdmin,
  ) {
    this.records = new UserRecordLinker(store);
  }

  /**
   * 409 email_taken / phone_taken (profiles.phone_e164 and teachers.phone_e164 are unique), and
   * for a new record-backed role 400 link_target_not_found / 409 link_taken.
   */
  async check(id: string, input: UserUpdate, record?: RecordLink): Promise<void> {
    if (input.email !== undefined) await this.assertEmailFree(id, input.email);
    if (input.phone_e164 && (await this.store.phoneTaken(input.phone_e164, id))) {
      throw conflict('phone_taken');
    }
    if (record) await this.records.assertLinkable(record.kind, record.request);
  }

  /**
   * Name and phone follow the profile for a linked teacher (guardian / student rows do not); a
   * new record is linked once the profile holds its role.
   */
  async write(id: string, change: ProfileChange): Promise<void> {
    if (hasKeys(change.patch)) await this.store.updateProfile(id, change.patch);
    const sync: TeacherSync = {};
    if (change.input.full_name !== undefined) sync.display_name_ar = change.input.full_name;
    if (change.input.phone_e164 !== undefined) sync.phone_e164 = change.input.phone_e164;
    if (hasKeys(sync)) await this.store.syncTeacher(id, sync);
    if (change.record) await this.records.link(change.record);
  }

  async setEmail(id: string, email: string | undefined): Promise<void> {
    if (email !== undefined) await this.auth.update(id, { email });
  }

  private async assertEmailFree(id: string, email: string): Promise<void> {
    const owner = await this.auth.findIdByEmail(email);
    if (owner && owner !== id) throw conflict('email_taken');
  }
}
