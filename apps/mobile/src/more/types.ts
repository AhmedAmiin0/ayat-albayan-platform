import type { AvailabilitySlot, JobApplicantStatus, TeacherStatus, TeacherStudentCounts } from '@ab/shared';

// The fields of apps/api responses this tab shows (R-TCH-01, R-TCH-02, R-LEAD-04). Nothing else.

/** GET /teachers, GET /teachers/:id */
export interface Teacher {
  id: string;
  display_name_ar: string;
  phone_e164: string | null;
  status: TeacherStatus;
  tz: string;
}

/** GET /teachers row: the teacher and their current students by kind («مشترك n · تجريبي n»). */
export type TeacherListItem = Teacher & TeacherStudentCounts;

/** GET /teachers/:id/availability: wall-clock «HH:MM» in `tz`, weekday 0 = الأحد. */
export type AvailabilityRow = AvailabilitySlot & { id: string };

/** GET /teachers/:id/time-off: UTC instants, newest first. */
export interface TimeOff {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

/** GET /job-applicants */
export interface JobApplicant {
  id: string;
  name: string | null;
  phone_e164: string;
  status: JobApplicantStatus;
  /** Links the applicant sent; absent from an older API. */
  cv_url?: string | null;
  recitation_url?: string | null;
}
