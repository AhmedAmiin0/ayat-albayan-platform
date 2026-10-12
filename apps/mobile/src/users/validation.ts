import {
  DEFAULT_PASSWORD_MIN,
  needsExistingRecord,
  normalizePhone,
  passwordProblem,
  type UserCreate,
} from '@ab/shared';
import { t } from '@/lib/i18n';
import type { CreateForm } from './create-form';

// The web's validation.ts, unchanged: the create / edit checks and the POST /users body.
const V = t.users.validation;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldKey = 'email' | 'full_name' | 'phone' | 'password' | 'linked' | 'teacher_name';
export type FormErrors = Partial<Record<FieldKey, string>>;

export const emailError = (v: string): string | undefined => (EMAIL.test(v.trim()) && v.trim().length <= 254 ? undefined : V.email);

export const nameError = (v: string): string | undefined => (v.trim().length >= 2 && v.trim().length <= 120 ? undefined : V.name);

/** Blank is fine (optional); otherwise the shared normaliser decides. */
export function phoneError(v: string): string | undefined {
  if (v.trim() === '') return undefined;
  const r = normalizePhone(v);
  return r.ok ? undefined : t.common.phoneErrors[r.reason === 'empty' ? 'invalid_length' : r.reason];
}

/** A typed password against the API's minimum (shared rule). */
export function passwordError(v: string, min: number = DEFAULT_PASSWORD_MIN): string | undefined {
  const problem = passwordProblem(v, min);
  if (!problem) return undefined;
  if (problem === 'blank') return V.passwordBlank;
  return problem === 'too_short' ? V.passwordShort.replace('{n}', String(min)) : V.passwordLong;
}

function linkErrors(f: CreateForm): FormErrors {
  if (f.role === 'teacher' && f.teacherMode === 'new') {
    return f.newTeacher.display_name_ar.trim().length >= 2 ? {} : { teacher_name: V.teacherName };
  }
  const needs = needsExistingRecord(f.role) || f.role === 'teacher';
  return needs && !f.linked ? { linked: V.linkRequired } : {};
}

export function createErrors(f: CreateForm): FormErrors {
  const out: FormErrors = { ...linkErrors(f) };
  const checks: [FieldKey, string | undefined][] = [
    ['email', emailError(f.email)],
    ['full_name', nameError(f.full_name)],
    ['phone', phoneError(f.phone)],
    ['password', f.credential === 'set' ? passwordError(f.password) : undefined],
  ];
  for (const [key, message] of checks) if (message) out[key] = message;
  return out;
}

const isLinkRole = (f: CreateForm) => f.role === 'teacher' || f.role === 'student' || f.role === 'guardian';

/** The POST /users body for a valid form (call after createErrors came back empty). */
export function createBody(f: CreateForm): UserCreate {
  const phone = f.phone.trim() ? normalizePhone(f.phone) : null;
  const newTeacher = f.role === 'teacher' && f.teacherMode === 'new';
  const en = f.newTeacher.display_name_en.trim();
  return {
    email: f.email.trim().toLowerCase(),
    full_name: f.full_name.trim(),
    role: f.role,
    credential: f.credential,
    ...(phone?.ok ? { phone_e164: phone.e164 } : {}),
    ...(f.role_id ? { role_id: f.role_id } : {}),
    ...(f.credential === 'set' ? { password: f.password } : {}),
    ...(isLinkRole(f) && !newTeacher && f.linked ? { linked_id: f.linked.id } : {}),
    ...(newTeacher
      ? { new_teacher: { display_name_ar: f.newTeacher.display_name_ar.trim(), gender: f.newTeacher.gender, ...(en ? { display_name_en: en } : {}) } }
      : {}),
  };
}
