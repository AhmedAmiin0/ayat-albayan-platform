import type { CredentialMode, LinkCandidate, UserRole } from '@ab/shared';

export interface NewTeacherForm {
  display_name_ar: string;
  display_name_en: string;
  gender: 'male' | 'female';
}

/** What the create dialog edits; `linked` is the picked existing record. */
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
