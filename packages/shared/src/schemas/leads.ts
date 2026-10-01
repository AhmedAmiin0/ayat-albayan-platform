import { z } from 'zod';
import { GENDERS, JOB_APPLICANT_STATUSES, LEAD_SOURCES, LEAD_STATUSES } from '../enums/index.js';
import { optionalText, phoneE164, timeOfDay, timeZone } from './common.js';

/** Structured, all-optional qualification captured in-thread (R-LEAD-03). */
export const leadQualificationSchema = z.object({
  student_name: optionalText,
  age: z.int().min(3).max(99).nullish(),
  gender: z.enum(GENDERS).nullish(),
  country: optionalText,
  tz: timeZone.nullish(),
  level: optionalText,
  memorized: optionalText,
  goal: optionalText,
  riwaya: optionalText,
  available_days: z.array(z.int().min(0).max(6)).nullish(),
  preferred_from: timeOfDay.nullish(),
  preferred_to: timeOfDay.nullish(),
});

/** Lead keyed by E.164 phone (R-LEAD-01). */
export const leadCreateSchema = z.object({
  phone_e164: phoneE164,
  name: optionalText,
  source: z.enum(LEAD_SOURCES).default('whatsapp_direct'),
  status: z.enum(LEAD_STATUSES).default('new'),
  tz: timeZone.nullish(),
  qualification: leadQualificationSchema.default({}),
  assigned_to: z.uuid().nullish(),
  next_follow_up_at: z.iso.datetime({ offset: true }).nullish(),
});
export const leadUpdateSchema = leadCreateSchema.omit({ phone_e164: true }).partial();

/** Job applicants are separate from leads (R-LEAD-04). */
export const jobApplicantCreateSchema = z.object({
  phone_e164: phoneE164,
  name: optionalText,
  status: z.enum(JOB_APPLICANT_STATUSES).default('new'),
  cv_url: z.url().nullish(),
  recitation_url: z.url().nullish(),
  notes: optionalText,
  from_lead_id: z.uuid().nullish(),
});
export const jobApplicantUpdateSchema = jobApplicantCreateSchema
  .omit({ phone_e164: true })
  .partial();

export type LeadQualification = z.infer<typeof leadQualificationSchema>;
export type LeadCreate = z.infer<typeof leadCreateSchema>;
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;
export type JobApplicantCreate = z.infer<typeof jobApplicantCreateSchema>;
export type JobApplicantUpdate = z.infer<typeof jobApplicantUpdateSchema>;
