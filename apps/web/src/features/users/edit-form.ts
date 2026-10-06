import { normalizePhone, type UserDetail, type UserRole, type UserRoleOption, type UserUpdate } from '@ab/shared';
import { emailError, nameError, phoneError, type FormErrors } from './validation';

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

export function editErrors(f: EditForm): FormErrors {
  const out: FormErrors = {};
  const checks = [
    ['email', emailError(f.email)],
    ['full_name', nameError(f.full_name)],
    ['phone', phoneError(f.phone)],
  ] as const;
  for (const [key, message] of checks) if (message) out[key] = message;
  return out;
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
  return Object.keys(body).length > 0 ? body : null;
}
