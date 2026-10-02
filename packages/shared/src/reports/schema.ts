import { z } from 'zod';
import { ATTENDANCES, GRADES } from '../enums/index.js';
import { attended, REPORT_RUBRICS, type Rubric } from './rules.js';

// Report commands (docs/11 §4). camelCase like every command; the identity (student, teacher,
// date, lesson no., program, link) is never sent: the API takes it from the lesson (R-REP-01, D1).

/** Free text from the form; blank → null so a cleared field really clears. */
const longText = z
  .string()
  .trim()
  .max(4000)
  .transform((v) => (v === '' ? null : v))
  .nullish();
const grade = z.enum(GRADES).nullish();

const gradesShape = Object.fromEntries(REPORT_RUBRICS.map((r) => [r, grade])) as Record<
  Rubric,
  typeof grade
>;

/** PUT /reports/:id/draft. Every field optional: autosave sends what the teacher has so far. */
export const reportDraftSchema = z.object({
  attendance: z.enum(ATTENDANCES).nullish(),
  recited: longText,
  newMemorization: longText,
  revision: longText,
  theory: longText,
  grades: z.object(gradesShape).partial().optional(),
  overall: grade,
  notes: longText,
  homework: longText,
  nextPlan: longText,
});

/**
 * Text the «تقرير الحلقة» Google Form required (inferred from 194/194 answers, research-forms
 * item 12): required when the student attended, like the grades. The rest stays optional.
 */
export const REPORT_REQUIRED_TEXT = ['recited', 'newMemorization', 'revision', 'notes', 'homework'] as const;

/**
 * POST /reports/:id/submit: the whole form. Attendance is required; when the student attended
 * (on time or late) the six rubric grades and the overall grade are required too (`missing_grades`),
 * then the REPORT_REQUIRED_TEXT fields (`missing_text`).
 * `expectedVersion` is the version the form was loaded at (409 `version_conflict` otherwise).
 */
export const reportSubmitSchema = reportDraftSchema
  .extend({ expectedVersion: z.int().min(0) })
  .superRefine((r, ctx) => {
    if (!r.attendance) {
      ctx.addIssue({ code: 'custom', path: ['attendance'], message: 'missing_attendance' });
      return;
    }
    if (!attended(r.attendance)) return;
    const missing = REPORT_RUBRICS.filter((k) => !r.grades?.[k]);
    if (missing.length > 0 || !r.overall) {
      ctx.addIssue({ code: 'custom', path: ['grades'], message: 'missing_grades' });
      return;
    }
    const blank = REPORT_REQUIRED_TEXT.filter((k) => !r[k]);
    if (blank.length > 0) ctx.addIssue({ code: 'custom', path: [blank[0] ?? 'recited'], message: 'missing_text' });
  });

/** POST /reports/:id/attachments/upload-url: the file the teacher picked (R-REP-02). */
export const ATTACHMENT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
] as const;
/** Same as the report-attachments bucket limit (migration 122). */
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export const attachmentUploadSchema = z.object({
  mime: z.enum(ATTACHMENT_MIMES, { message: 'attachment_type' }),
  size: z.int().min(1).max(ATTACHMENT_MAX_BYTES, { message: 'attachment_too_large' }),
});

/** POST /reports/:id/attachments: register a file after its signed upload succeeded. */
export const attachmentRegisterSchema = attachmentUploadSchema.extend({
  path: z.string().min(1),
});

export type ReportDraft = z.output<typeof reportDraftSchema>;
export type ReportSubmit = z.output<typeof reportSubmitSchema>;
export type AttachmentUpload = z.output<typeof attachmentUploadSchema>;
export type AttachmentRegister = z.output<typeof attachmentRegisterSchema>;
