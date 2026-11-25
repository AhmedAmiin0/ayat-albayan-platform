import type { Gender, Program, TeacherStatus } from '@ab/catalog';
import type { AvailabilitySlot, TeacherMeetingMode } from '@ab/schedule';
import type { TeacherStudentCounts } from '../students';

// Response shapes of apps/api people/teachers (R-TCH-01, R-TCH-02), as the clients read them.

/**
 * GET /teachers/:id (and POST / PATCH): the row without its stored photo path. `meeting_mode`: the
 * raw column (null = follow settings.meeting_link_auto); `platform_classroom`: what it resolves to
 * now (usesPlatform, migration 490).
 */
export interface Teacher {
  id: string;
  display_name_ar: string;
  display_name_en: string | null;
  gender: Gender;
  programs: Program[];
  phone_e164: string | null;
  meeting_link: string | null;
  meeting_mode: TeacherMeetingMode | null;
  platform_classroom: boolean;
  rate_30: number | null;
  rate_45: number | null;
  rate_60: number | null;
  rate_90: number | null;
  max_students: number | null;
  status: TeacherStatus;
  tz: string;
  calendar_owner: string;
  calendar_owner_changed_at: string | null;
  calendar_owner_changed_by: string | null;
  google_calendar_id: string | null;
  mirror_enabled: boolean;
  /** The teacher's login; null until created on the users page (docs/30). */
  profile_id: string | null;
  /** That login's sign-in username (docs/30); null without one; GET /teachers rows carry none. */
  username?: string | null;
  /** The teacher's photo, a short-lived signed URL; null = the initials. */
  avatar_url: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/** A row of GET /teachers: the teacher and their current students by kind. */
export type TeacherListRow = Teacher & TeacherStudentCounts;

/** Wall-clock "HH:MM" in `tz`, weekday 0 = Sunday. */
export type AvailabilityRow = AvailabilitySlot & { id: string };

/** GET /teachers/:id/time-off: UTC instants, newest first. */
export interface TimeOff {
  id: string;
  teacher_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}
