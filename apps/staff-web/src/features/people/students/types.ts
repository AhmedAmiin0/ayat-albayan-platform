import type { FamilyPhone, Gender, Program, StudentStatus } from '@ab/shared';

// Response shapes of apps/api/src/modules/students (students.mapper.ts).

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export type StudentRef = { id: string; code: string | null; name: string; status: StudentStatus };

export type StudentListItem = StudentRef & {
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
};

export type StudentProfile = StudentRef & {
  guardian_id: string;
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
  /** «رقم الواتساب لـ: الطالب نفسه» (docs/30 §1); absent from an older API = false. */
  contact_is_self?: boolean;
  /** phones: the main number and a second one (owner 2026-10-29); absent from an older API (secondPhoneOf). */
  guardian: { id: string; name: string; phone_e164: string; phones?: FamilyPhone[] };
  teacher: { id: string; display_name_ar: string; meeting_link: string | null } | null;
  /** Override, else the teacher's fixed link (R-STU-05). */
  meeting_link: string | null;
  siblings: StudentRef[];
};

export type TeacherOption = { id: string; display_name_ar: string; meeting_link: string | null };

/** 409 body of POST /students (R-STU-03). */
export type DuplicateBody = { message: 'duplicate_student'; guardian_id: string; candidates: StudentRef[] };
