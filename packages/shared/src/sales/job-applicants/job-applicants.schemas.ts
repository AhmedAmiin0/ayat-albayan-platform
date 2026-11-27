import { JOB_APPLICANT_STATUSES } from '@ab/catalog';
import { hasAnyValue, instant, pageQuery, partialOf } from '@ab/core';
import { z } from 'zod';
import { applicantColumnQueryShape, jobApplicantCreateSchema } from '../../people/schemas';

export const jobApplicantStatusSchema = z.enum(JOB_APPLICANT_STATUSES);

const blankToUndefined = (value: unknown) => (value === '' ? undefined : value);

/** GET /job-applicants: paging, `q`, status and the column filters (R-NFR-08). */
export const jobApplicantListQuerySchema = z.object({
  status: z.preprocess(blankToUndefined, jobApplicantStatusSchema.optional()),
  ...pageQuery({ size: 25 }),
  q: z.string().optional(),
  ...applicantColumnQueryShape,
});
export type JobApplicantListQuery = z.infer<typeof jobApplicantListQuerySchema>;
export type JobApplicantListQueryInput = z.input<typeof jobApplicantListQuerySchema>;

// Status moves only through PATCH :id/status; from_lead_id is set only by a lead's reclassify.
export const jobApplicantCreateBodySchema = jobApplicantCreateSchema.omit({
  status: true,
  from_lead_id: true,
});
export type JobApplicantCreateBody = z.infer<typeof jobApplicantCreateBodySchema>;
export type JobApplicantCreateBodyInput = z.input<typeof jobApplicantCreateBodySchema>;

export const jobApplicantUpdateBodySchema = partialOf(
  jobApplicantCreateSchema.omit({ phone_e164: true, status: true, from_lead_id: true }),
).refine(hasAnyValue, 'empty_update');
export type JobApplicantUpdateBody = z.infer<typeof jobApplicantUpdateBodySchema>;
export type JobApplicantUpdateBodyInput = z.input<typeof jobApplicantUpdateBodySchema>;

export const jobApplicantStatusBodySchema = z.object({ status: jobApplicantStatusSchema });
export type JobApplicantStatusBody = z.infer<typeof jobApplicantStatusBodySchema>;

/** A job_applicants row as the api answers it (R-LEAD-04). */
export const jobApplicantViewSchema = z.object({
  id: z.string(),
  phone_e164: z.string(),
  name: z.string().nullable(),
  status: jobApplicantStatusSchema,
  cv_url: z.string().nullable(),
  recitation_url: z.string().nullable(),
  notes: z.string().nullable(),
  from_lead_id: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: instant,
  updated_at: instant,
});
export type JobApplicantView = z.infer<typeof jobApplicantViewSchema>;
