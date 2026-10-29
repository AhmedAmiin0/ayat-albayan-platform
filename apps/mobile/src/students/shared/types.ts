import type { FamilyPhone, Gender, Program, StudentStatus } from '@ab/shared';

// Response shapes of apps/api/src/modules/students (students.mapper.ts), the fields mobile reads.
// Same as apps/web/src/features/students/types.ts; the apps cannot import each other.

export type StudentRef = { id: string; code: string | null; name: string; status: StudentStatus };

/** GET /students row. */
export type StudentListItem = StudentRef & {
  program: Program;
  tz: string;
  guardian_name: string;
  guardian_phone: string;
  teacher_name: string | null;
};

/** GET /students/:id. */
export type StudentProfile = StudentRef & {
  /** «سن الطالب» / «النوع» from the registration form; optional: a profile cached by an older build has none. */
  age?: number | null;
  gender?: Gender | null;
  program: Program;
  level: string | null;
  memorized: string | null;
  goal: string | null;
  riwaya: string | null;
  tz: string;
  /** «رقم الواتساب لـ: الطالب نفسه» (docs/30 §1); absent from an older API / cache = «ولي الأمر». */
  contact_is_self?: boolean;
  /** phones: the main number (is_primary) and a second one (owner 2026-10-29); absent from an older API / cache. */
  guardian: { id: string; name: string; phone_e164: string; phones?: FamilyPhone[] };
  teacher: { id: string; display_name_ar: string; meeting_link: string | null } | null;
  /** Override, else the teacher's fixed link (R-STU-05). */
  meeting_link: string | null;
  siblings: StudentRef[];
};
