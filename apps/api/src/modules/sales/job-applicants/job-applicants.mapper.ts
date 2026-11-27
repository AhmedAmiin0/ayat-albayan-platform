import { jobApplicantViewSchema, type JobApplicantView } from '@ab/shared';
import { asResponse } from '@/common/http/returns';
import type { JobApplicantRow } from './job-applicants.repo';

export function toJobApplicantView(row: JobApplicantRow): JobApplicantView {
  return asResponse(jobApplicantViewSchema, row);
}
