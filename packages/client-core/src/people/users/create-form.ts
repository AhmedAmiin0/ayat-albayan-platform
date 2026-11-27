import { isLinkedRole, type CredentialMode, type LinkCandidate, type UserCreate } from '@ab/shared';
import type { UserRole } from '@ab/catalog';
import { normalizePhone } from '@ab/core';

export interface NewTeacherForm {
  display_name_ar: string;
  display_name_en: string;
  gender: 'male' | 'female';
}

/** `linked` is the picked existing record. */
export interface CreateForm {
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  role_id: string;
  credential: CredentialMode;
  password: string;
  linked: LinkCandidate | null;
  teacherMode: 'existing' | 'new';
  newTeacher: NewTeacherForm;
}

/** A role and record already picked, as when creating an account from the student file. */
export interface Prefill {
  role: UserRole;
  linked?: LinkCandidate;
}

export function initialCreateForm(prefill?: Prefill): CreateForm {
  return {
    email: '',
    full_name: prefill?.linked?.name ?? '',
    phone: '',
    role: prefill?.role ?? 'assistant',
    role_id: '',
    credential: 'generate',
    password: '',
    linked: prefill?.linked ?? null,
    teacherMode: 'existing',
    newTeacher: { display_name_ar: '', display_name_en: '', gender: 'female' },
  };
}

type LinkForm = Pick<CreateForm, 'role' | 'linked' | 'teacherMode' | 'newTeacher'>;
const wantsNewTeacher = (f: LinkForm): boolean => f.role === 'teacher' && f.teacherMode === 'new';

/** The record part of a POST /users or PATCH /users/:id body: an existing row or a new teacher. */
export function linkFields(f: LinkForm): Pick<UserCreate, 'linked_id' | 'new_teacher'> {
  const { display_name_ar: ar, display_name_en: en, gender } = f.newTeacher;
  const english = en.trim() ? { display_name_en: en.trim() } : {};
  const teacher = { display_name_ar: ar.trim(), gender, ...english };
  if (wantsNewTeacher(f)) return { new_teacher: teacher };
  return isLinkedRole(f.role) && f.linked ? { linked_id: f.linked.id } : {};
}

/** The record of a record-backed role is named: a picked row of that kind, or a new teacher. */
export const recordNamed = (f: LinkForm): boolean =>
  wantsNewTeacher(f) ? f.newTeacher.display_name_ar.trim().length >= 2 : f.linked?.kind === f.role;

/** The POST /users body for a valid form (call after createErrors came back empty). */
export function createBody(f: CreateForm): UserCreate {
  const phone = f.phone.trim() ? normalizePhone(f.phone) : null;
  return {
    email: f.email.trim().toLowerCase(),
    full_name: f.full_name.trim(),
    role: f.role,
    credential: f.credential,
    ...(phone?.ok ? { phone_e164: phone.e164 } : {}),
    ...(f.role_id ? { role_id: f.role_id } : {}),
    ...(f.credential === 'set' ? { password: f.password } : {}),
    ...linkFields(f),
  };
}
