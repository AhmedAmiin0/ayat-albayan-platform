import { PDF_STATUSES, REPORT_STATUSES } from '@ab/catalog';
import { z } from 'zod';
import { reportPageReportSchema } from '../page';
import { reportAttachmentViewSchema } from '../page-access';

const instant = z.string().nullable();

/** One lesson_reports row as the form and the history read it (docs/11 §4). */
export const reportViewSchema = reportPageReportSchema.extend({
  id: z.string(),
  lesson_id: z.string(),
  student_id: z.string(),
  teacher_id: z.string(),
  status: z.enum(REPORT_STATUSES),
  version: z.int().min(0),
  pdf_status: z.enum(PDF_STATUSES).nullable(),
  pdf_error: z.string().nullable(),
  sent_at: instant,
  /** Oldest first. */
  attachments: z.array(reportAttachmentViewSchema),
  /** canEditReport for the caller, now. */
  can_edit: z.boolean(),
  /** End of the teacher's edit window (editUntil); null while a draft. */
  edit_until: instant,
});

export type ReportView = z.infer<typeof reportViewSchema>;
