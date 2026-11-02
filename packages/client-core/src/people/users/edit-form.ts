import { normalizePhone, type UserDetail, type UserRole, type UserRoleOption, type UserUpdate } from '@ab/shared';

/** What the edit panel edits. `role_id` '' = the base role's own (system) role. */
export interface EditForm {
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

export function initialEditForm(d: UserDetail, options: readonly UserRoleOption[]): EditForm {
  return {
    email: d.email ?? '',
    full_name: d.full_name,
    phone: d.phone_e164 ?? '',
    locale: d.locale === 'en' ? 'en' : 'ar',
    tz: d.tz,
    role: d.role,
    role_id: customRoleId(d, options),
  };
}

/** `part` when `when` holds, else nothing: one PATCH field that changed. */
const onlyIf = <T extends object>(when: boolean, part: T): Partial<T> => (when ? part : {});

/** The typed phone in E.164; null when empty or not a phone (editErrors rejected that). */
function e164Of(raw: string): string | null {
  const phone = raw.trim() ? normalizePhone(raw) : null;
  return phone?.ok ? phone.e164 : null;
}

/** The role and its custom role travel together: either changed sends `role_id` ('' → null). */
function roleIdPart(
  d: UserDetail,
  f: EditForm,
  options: readonly UserRoleOption[],
): Partial<UserUpdate> {
  const changed = f.role !== d.role || f.role_id !== customRoleId(d, options);
  return onlyIf(changed, { role_id: f.role_id || null });
}

/** The PATCH body: only what changed (null when nothing did). Call after editErrors is empty. */
export function editBody(d: UserDetail, f: EditForm, options: readonly UserRoleOption[]): UserUpdate | null {
  const email = f.email.trim().toLowerCase();
  const full_name = f.full_name.trim();
  const phone_e164 = e164Of(f.phone);
  const body: UserUpdate = {
    ...onlyIf(email !== (d.email ?? ''), { email }),
    ...onlyIf(full_name !== d.full_name, { full_name }),
    ...onlyIf(phone_e164 !== d.phone_e164, { phone_e164 }),
    ...onlyIf(f.locale !== d.locale, { locale: f.locale }),
    ...onlyIf(f.tz !== d.tz, { tz: f.tz }),
    ...onlyIf(f.role !== d.role, { role: f.role }),
    ...roleIdPart(d, f, options),
  };
  return Object.keys(body).length > 0 ? body : null;
}
