import type { Gender, LessonStatus, PackageSize, Program } from '@ab/catalog';

export interface Range {
  from: Date;
  to: Date;
}

export interface BookingStudent {
  id: string;
  name: string;
  program: Program;
  teacher_gender_pref: Gender | null;
  meeting_link_override: string | null;
  guardian: { id: string; phone_e164: string; tz: string };
}

export interface BookingTeacher {
  id: string;
  tz: string;
  meeting_link: string | null;
  /** teachers.meeting_mode (migration 490), null = the academy default; optional in fakes. */
  meeting_mode?: string | null;
}

/** The lesson a makeup would replace, with who was on it and whether each was charged. */
export interface MakeupOriginalRow {
  id: string;
  status: LessonStatus;
  starts_at: string;
  makeup_of_id: string | null;
  rule: { package: PackageSize | null } | null;
  lesson_students: { student_id: string; chargeable: boolean }[];
}
