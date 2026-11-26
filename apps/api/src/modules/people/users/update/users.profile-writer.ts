import type { UserUpdate } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import {
  AUTH_ADMIN,
  USER_STORE,
  type AuthAdmin,
  type ProfilePatch,
  type UserRow,
  type UserStore,
} from '@/modules/people/users/store/users.store';
import { sentOnly } from '@/modules/people/users/users.logic';
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
  /** The profile before the request: what a failed record link puts back. */
  before: UserRow;
}

const hasKeys = (o: object): boolean => Object.keys(o).length > 0;

const PROFILE_COLUMNS = [
  'role',
  'role_id',
  'full_name',
  'phone_e164',
  'locale',
  'tz',
] as const satisfies readonly (keyof ProfilePatch)[];

/** The old values of the columns the patch wrote. */
export const undoOf = (patch: ProfilePatch, before: UserRow): ProfilePatch =>
  sentOnly(
    before,
    PROFILE_COLUMNS.filter((k) => patch[k] !== undefined),
  );

/** The phone a new teacher row will carry; teachers.phone_e164 is unique, so it is checked too. */
const newTeacherPhone = (record: RecordLink | undefined): string | null =>
  record?.request.new_teacher ? record.profile.phone_e164 : null;

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
    await this.assertPhonesFree(id, input, record);
    if (record) await this.records.assertLinkable(record.kind, record.request);
  }

  /**
   * Name and phone follow the profile for a linked teacher (guardian / student rows do not); a
   * new record is linked once the profile holds its role, and a failed link puts the profile back.
   */
  async write(id: string, change: ProfileChange): Promise<void> {
    if (hasKeys(change.patch)) await this.store.updateProfile(id, change.patch);
    const sync: TeacherSync = {};
    if (change.input.full_name !== undefined) sync.display_name_ar = change.input.full_name;
    if (change.input.phone_e164 !== undefined) sync.phone_e164 = change.input.phone_e164;
    if (hasKeys(sync)) await this.store.syncTeacher(id, sync);
    if (change.record) await this.linkOrUndo(id, { ...change, record: change.record });
  }

  async setEmail(id: string, email: string | undefined): Promise<void> {
    if (email !== undefined) await this.auth.update(id, { email });
  }

  private async linkOrUndo(id: string, change: ProfileChange & { record: RecordLink }) {
    try {
      await this.records.link(change.record);
    } catch (e) {
      await this.store.updateProfile(id, undoOf(change.patch, change.before));
      throw e;
    }
  }

  private async assertPhonesFree(id: string, input: UserUpdate, record?: RecordLink) {
    if (input.phone_e164 && (await this.store.phoneTaken(input.phone_e164, id))) {
      throw conflict('phone_taken');
    }
    const teacherPhone = newTeacherPhone(record);
    if (teacherPhone && (await this.store.teacherPhoneHeld(teacherPhone))) {
      throw conflict('phone_taken');
    }
  }

  private async assertEmailFree(id: string, email: string): Promise<void> {
    const owner = await this.auth.findIdByEmail(email);
    if (owner && owner !== id) throw conflict('email_taken');
  }
}
