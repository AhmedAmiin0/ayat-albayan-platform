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

interface TeacherSync {
  display_name_ar?: string;
  phone_e164?: string | null;
}

const hasKeys = (o: object): boolean => Object.keys(o).length > 0;

/**
 * The profile side of PATCH /users/:id: the email and phone owners are checked before anything is
 * written, then the profile and its linked teacher; the auth email changes last.
 */
@Injectable()
export class UserProfileWriter {
  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    @Inject(AUTH_ADMIN) private readonly auth: AuthAdmin,
  ) {}

  /** 409 email_taken / phone_taken (profiles.phone_e164 and teachers.phone_e164 are unique). */
  async check(id: string, input: UserUpdate): Promise<void> {
    if (input.email !== undefined) await this.assertEmailFree(id, input.email);
    if (input.phone_e164 && (await this.store.phoneTaken(input.phone_e164, id))) {
      throw conflict('phone_taken');
    }
  }

  /** Name and phone follow the profile for a linked teacher (guardian / student rows do not). */
  async write(id: string, change: { patch: ProfilePatch; input: UserUpdate }): Promise<void> {
    if (hasKeys(change.patch)) await this.store.updateProfile(id, change.patch);
    const sync: TeacherSync = {};
    if (change.input.full_name !== undefined) sync.display_name_ar = change.input.full_name;
    if (change.input.phone_e164 !== undefined) sync.phone_e164 = change.input.phone_e164;
    if (hasKeys(sync)) await this.store.syncTeacher(id, sync);
  }

  async setEmail(id: string, email: string | undefined): Promise<void> {
    if (email !== undefined) await this.auth.update(id, { email });
  }

  private async assertEmailFree(id: string, email: string): Promise<void> {
    const owner = await this.auth.findIdByEmail(email);
    if (owner && owner !== id) throw conflict('email_taken');
  }
}
