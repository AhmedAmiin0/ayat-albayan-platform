import { normalizePhone, type CredentialMode, type LinkCandidate, type UserCreate, type UserRole } from '@ab/shared';

export interface NewTeacherForm {
  display_name_ar: string;
  display_name_en: string;
  gender: 'male' | 'female';
}

/** What «مستخدم جديد» edits (web dialog, mobile screen); `linked` is the picked existing record. */
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

/** A role and record already picked (the student file's «إنشاء حساب»). */
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
