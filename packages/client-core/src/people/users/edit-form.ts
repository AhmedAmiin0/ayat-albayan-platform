import { isLinkedRole, type UserDetail, type UserRoleOption, type UserUpdate } from '@ab/shared';
import type { UserRole } from '@ab/catalog';
import { normalizePhone } from '@ab/core';
import { initialCreateForm, linkFields, recordNamed, type CreateForm } from './create-form';

/**
 * What the edit panel edits. `role_id` '' = the base role's own (system) role; the record fields
 * name the record of a new teacher / student / guardian role.
 */
export interface EditForm extends Pick<CreateForm, 'linked' | 'teacherMode' | 'newTeacher'> {
  email: string;
  full_name: string;
  phone: string;
  locale: 'ar' | 'en';
  tz: string;
  role: UserRole;
  role_id: string;
}

/** The custom role a user holds ('' when the held role is the system one). */
function customRoleId(d: UserDetail, options: readonly UserRoleOption[]): string {
  const held = options.find((o) => o.id === d.role_id);
  return held && !held.is_system ? held.id : '';
}

/** The role cannot change: the login has a record, or its role needs one (role_change_linked). */
export const roleLocked = (d: UserDetail): boolean => Boolean(d.linked) || isLinkedRole(d.role);

const opensRecord = (d: UserDetail, f: EditForm): boolean => !roleLocked(d) && isLinkedRole(f.role);

/** Save waits until the record of the new teacher / student / guardian role is named. */
export const recordMissing = (d: UserDetail, f: EditForm): boolean =>
  opensRecord(d, f) && !recordNamed(f);

export function initialEditForm(d: UserDetail, options: readonly UserRoleOption[]): EditForm {
  const { linked, teacherMode, newTeacher } = initialCreateForm();
  return {
    linked,
    teacherMode,
    newTeacher,
    email: d.email ?? '',
    full_name: d.full_name,
    phone: d.phone_e164 ?? '',
    locale: d.locale === 'en' ? 'en' : 'ar',
    tz: d.tz,
    role: d.role,
    role_id: customRoleId(d, options),
  };
}

/** The PATCH body: only what changed (null when nothing did). Call after editErrors is empty. */
export function editBody(d: UserDetail, f: EditForm, options: readonly UserRoleOption[]): UserUpdate | null {
  const body: UserUpdate = {};
  const phone = f.phone.trim() ? normalizePhone(f.phone) : null;
  const e164 = phone?.ok ? phone.e164 : null;
  if (f.email.trim().toLowerCase() !== (d.email ?? '')) body.email = f.email.trim().toLowerCase();
  if (f.full_name.trim() !== d.full_name) body.full_name = f.full_name.trim();
  if (e164 !== d.phone_e164) body.phone_e164 = e164;
  if (f.locale !== d.locale) body.locale = f.locale;
  if (f.tz !== d.tz) body.tz = f.tz;
  if (f.role !== d.role) body.role = f.role;
  if (f.role !== d.role || f.role_id !== customRoleId(d, options)) body.role_id = f.role_id || null;
  if (opensRecord(d, f)) Object.assign(body, linkFields(f));
  return Object.keys(body).length > 0 ? body : null;
}
