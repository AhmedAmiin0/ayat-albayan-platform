import type { Gender, Program, StudentStatus } from '@ab/catalog';

// Response shapes of apps/api people/students (students.mapper.ts), as the clients read them.

/** One number of a family: GET /guardians/:id `phones`, the student profile's `guardian.phones`. */
export interface FamilyPhone {
  phone_e164: string;
  is_primary: boolean;
}

export interface StudentRef {
  id: string;
  code: string | null;
  name: string;
  status: StudentStatus;
}

/** GET /students row. */
export interface StudentListItem extends StudentRef {
  program: Program;
  tz: string;
  created_at: string;
  guardian_name: string;
  guardian_phone: string;
  teacher_name: string | null;
  /** Newest package's remaining lessons; null without a package. */
  package_remaining?: number | null;
  /** On an active weekly schedule rule. */
  has_weekly?: boolean;
  /** A test student (docs/56); absent from an older API = real. */
  is_test?: boolean;
}

/** GET /students/teacher-options: the active teachers. */
export interface TeacherOption {
  id: string;
  display_name_ar: string;
  meeting_link: string | null;
}

/** GET /students/:id. */
export interface StudentProfile extends StudentRef {
  guardian_id: string;
  /** «سن الطالب» / «النوع» from the registration form. */
  age: number | null;
  gender: Gender | null;
  program: Program;
  level: string | null;
  memorized: string | null;
  goal: string | null;
  riwaya: string | null;
  tz: string;
  teacher_id: string | null;
  meeting_link_override: string | null;
  notes: string | null;
  /** «رقم الواتساب لـ: الطالب نفسه» (docs/30 §1); absent from an older API = «ولي الأمر». */
  contact_is_self?: boolean;
  /** A test student (docs/56); absent from an older API = real. */
  is_test?: boolean;
  /** The main number and a second one; absent from an older API or cache. */
  guardian: { id: string; name: string; phone_e164: string; phones?: FamilyPhone[] };
  teacher: { id: string; display_name_ar: string; meeting_link: string | null } | null;
  /** Override, else the teacher's fixed link (R-STU-05). */
  meeting_link: string | null;
  siblings: StudentRef[];
}

/** 409 body of POST /students (R-STU-03). */
export interface DuplicateStudentBody {
  message: 'duplicate_student';
  guardian_id: string;
  candidates: StudentRef[];
}
