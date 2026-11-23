import type { JobApplicantStatus } from '@ab/catalog';

// The fields of apps/api responses this tab shows (R-LEAD-04). Nothing else. The teacher shapes
// (Teacher, TeacherListRow, AvailabilityRow, TimeOff) live in @ab/shared.

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
